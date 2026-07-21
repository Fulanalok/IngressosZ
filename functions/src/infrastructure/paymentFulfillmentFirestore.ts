/* eslint-disable require-jsdoc, max-len */
import {
  FieldValue,
  Firestore,
  Timestamp,
} from "firebase-admin/firestore";
import {
  FulfillmentCommand,
  FulfillmentResult,
  LegacyPurchase,
  PaymentFulfillmentRepository,
  PersistedPaymentSession,
  WebhookOutcome,
  classifyFulfillmentSessionStatus,
  classifyLegacyPurchases,
  classifyPaymentCompatibility,
  classifyWebhookGate,
  moneyToCents,
  ticketExpirySeconds,
} from "../domain/paymentFulfillment.js";
import { isApprovedAfterInitiationExpiry } from
  "../domain/paymentSessionLifecycle.js";

type EventData = {
  availableTickets?: unknown;
  inventory?: unknown;
  date?: unknown;
  time?: unknown;
};

function asNonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string" || !value.trim()) return undefined;
  return value.trim();
}

function terminalEventData(
  command: FulfillmentCommand,
  outcome: WebhookOutcome,
  reason: string | undefined,
  purchaseId: string | undefined,
  approvedAfterInitiationExpiry = false
) {
  const amountInCents = moneyToCents(
    command.providerPayment.transaction_amount
  );
  return {
    paymentId: command.paymentId,
    paymentSessionId: command.sessionReference.paymentSessionId ?? "",
    outcome,
    ...(purchaseId ? { purchaseId } : {}),
    ...(reason ? { reason } : {}),
    ...(approvedAfterInitiationExpiry ? {
      approvedAfterInitiationExpiry: true,
    } : {}),
    providerStatus: command.providerPayment.status ?? "",
    amountInCents: amountInCents ?? null,
    currency: command.providerPayment.currency_id ?? "",
    createdAt: Timestamp.fromMillis(command.nowMillis),
    updatedAt: Timestamp.fromMillis(command.nowMillis),
  };
}

function existingResult(data: Record<string, unknown>): FulfillmentResult {
  return {
    outcome: data.outcome as WebhookOutcome,
    purchaseId: typeof data.purchaseId === "string" ? data.purchaseId : undefined,
    newlyProcessed: false,
  };
}

export function createFirestorePaymentFulfillmentRepository(
  db: Firestore
): PaymentFulfillmentRepository {
  return {
    async fulfill(command) {
      const webhookRef = db.collection("paymentWebhookEvents")
        .doc(command.paymentId);
      const sessionId = command.sessionReference.paymentSessionId;
      const sessionRef = sessionId ?
        db.collection("paymentSessions").doc(sessionId) : undefined;

      // Atomic fulfillment has a deliberate, explicit outcome decision table.
      // eslint-disable-next-line complexity
      return db.runTransaction(async (transaction) => {
        const webhookSnapshot = await transaction.get(webhookRef);
        const gate = classifyWebhookGate(
          webhookSnapshot.data()?.outcome,
          command.providerPayment
        );
        if (gate.kind === "terminal") {
          return existingResult(webhookSnapshot.data() ?? {});
        }
        if (gate.kind === "transient_not_approved") {
          return {
            outcome: "ignored_not_approved",
            newlyProcessed: false,
          };
        }

        if (!sessionRef) {
          const outcome: WebhookOutcome = "refund_required_invalid_session";
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              outcome,
              command.sessionReference.reason ?? "missing_reference",
              undefined
            )
          );
          return { outcome, newlyProcessed: true };
        }

        const sessionSnapshot = await transaction.get(sessionRef);
        if (!sessionSnapshot.exists) {
          const outcome: WebhookOutcome = "refund_required_invalid_session";
          transaction.create(
            webhookRef,
            terminalEventData(command, outcome, "session_not_found", undefined)
          );
          return { outcome, newlyProcessed: true };
        }

        const session = sessionSnapshot.data() as PersistedPaymentSession;
        const approvedAfterInitiationExpiry =
          session.approvedAfterInitiationExpiry === true ||
          isApprovedAfterInitiationExpiry(session, command.nowMillis);
        const approvalAuditFields = approvedAfterInitiationExpiry ? {
          approvedAfterInitiationExpiry: true,
        } : {};
        if (session.status === "approved") {
          const compatibility = classifyPaymentCompatibility({
            paymentId: command.paymentId,
            payment: command.providerPayment,
            session,
            eventExists: false,
          });
          if (compatibility.kind === "permanent") {
            transaction.create(
              webhookRef,
              terminalEventData(
                command,
                compatibility.outcome,
                compatibility.reason,
                undefined
              )
            );
            return { outcome: compatibility.outcome, newlyProcessed: true };
          }
          if (compatibility.kind !== "idempotent") {
            throw new Error("Sessao approved produziu estado incompativel.");
          }
          const purchaseRef = compatibility.purchaseId ?
            db.collection("purchases").doc(compatibility.purchaseId) : undefined;
          const purchaseSnapshot = purchaseRef ?
            await transaction.get(purchaseRef) : undefined;
          if (approvedAfterInitiationExpiry) {
            transaction.update(sessionRef, approvalAuditFields);
            if (purchaseSnapshot?.exists && purchaseRef) {
              transaction.update(purchaseRef, approvalAuditFields);
            }
          }
          const outcome: WebhookOutcome = "processed";
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              outcome,
              "idempotent_session",
              compatibility.purchaseId,
              approvedAfterInitiationExpiry
            )
          );
          return {
            outcome,
            purchaseId: compatibility.purchaseId,
            newlyProcessed: false,
          };
        }

        const statusCompatibility = classifyFulfillmentSessionStatus(session);
        if (statusCompatibility.kind === "permanent") {
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              statusCompatibility.outcome,
              statusCompatibility.reason,
              undefined
            )
          );
          return {
            outcome: statusCompatibility.outcome,
            newlyProcessed: true,
          };
        }

        const legacyPurchasesSnapshot = await transaction.get(
          db.collection("purchases")
            .where("paymentId", "==", command.paymentId)
            .limit(2)
        );
        const legacyPurchaseResult = classifyLegacyPurchases({
          paymentId: command.paymentId,
          payment: command.providerPayment,
          paymentSessionId: sessionRef.id,
          session,
          purchases: legacyPurchasesSnapshot?.docs.map((document) => ({
            id: document.id,
            ...document.data(),
          } as LegacyPurchase)) ?? [],
        });
        if (legacyPurchaseResult.kind === "processed") {
          const legacyPurchaseRef = db.collection("purchases")
            .doc(legacyPurchaseResult.purchaseId);
          if (approvedAfterInitiationExpiry) {
            transaction.update(legacyPurchaseRef, approvalAuditFields);
          }
          transaction.update(sessionRef, {
            status: "approved",
            providerState: "created",
            paymentId: command.paymentId,
            purchaseId: legacyPurchaseResult.purchaseId,
            approvedAt: Timestamp.fromMillis(command.nowMillis),
            updatedAt: Timestamp.fromMillis(command.nowMillis),
            errorMessage: FieldValue.delete(),
            ...approvalAuditFields,
          });
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              "processed",
              "legacy_purchase_reconciled",
              legacyPurchaseResult.purchaseId,
              approvedAfterInitiationExpiry
            )
          );
          return {
            outcome: "processed",
            purchaseId: legacyPurchaseResult.purchaseId,
            newlyProcessed: false,
          };
        }
        if (legacyPurchaseResult.kind === "oversold") {
          const legacyPurchaseRef = db.collection("purchases")
            .doc(legacyPurchaseResult.purchaseId);
          transaction.update(legacyPurchaseRef, {
            status: "refund_required_oversold",
            updatedAt: Timestamp.fromMillis(command.nowMillis),
            ...approvalAuditFields,
          });
          transaction.update(sessionRef, {
            status: "refund_required",
            refundReason: "oversold",
            providerState: "created",
            paymentId: command.paymentId,
            purchaseId: legacyPurchaseResult.purchaseId,
            updatedAt: Timestamp.fromMillis(command.nowMillis),
            ...approvalAuditFields,
          });
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              "refund_required_oversold",
              "legacy_refunded_oversold_reconciled",
              legacyPurchaseResult.purchaseId,
              approvedAfterInitiationExpiry
            )
          );
          return {
            outcome: "refund_required_oversold",
            purchaseId: legacyPurchaseResult.purchaseId,
            newlyProcessed: false,
          };
        }
        if (legacyPurchaseResult.kind === "conflict") {
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              legacyPurchaseResult.outcome,
              legacyPurchaseResult.reason,
              undefined
            )
          );
          return {
            outcome: legacyPurchaseResult.outcome,
            newlyProcessed: false,
          };
        }

        const eventId = asNonEmptyString(session.eventId);
        const eventRef = eventId ? db.collection("events").doc(eventId) : undefined;
        const eventSnapshot = eventRef ? await transaction.get(eventRef) : undefined;
        const compatibility = classifyPaymentCompatibility({
          paymentId: command.paymentId,
          payment: command.providerPayment,
          session,
          eventExists: Boolean(eventSnapshot?.exists),
        });
        if (compatibility.kind === "permanent") {
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              compatibility.outcome,
              compatibility.reason,
              undefined
            )
          );
          if (compatibility.reason !== "session_already_has_another_payment") {
            transaction.update(sessionRef, {
              status: "refund_required",
              refundReason: compatibility.reason,
              paymentId: command.paymentId,
              updatedAt: Timestamp.fromMillis(command.nowMillis),
            });
          }
          return { outcome: compatibility.outcome, newlyProcessed: true };
        }

        const quantity = session.quantity as number;
        const ticketType = session.ticketType as string;
        const event = eventSnapshot!.data() as EventData;
        const availableTickets = Number(event.availableTickets);
        const inventory = event.inventory && typeof event.inventory === "object" &&
          !Array.isArray(event.inventory) ?
          event.inventory as Record<string, unknown> : undefined;
        const typeInventory = inventory?.[ticketType];
        const currentTypeStock = typeInventory === undefined ?
          availableTickets : Number(typeInventory);
        const oversold = !Number.isSafeInteger(availableTickets) ||
          !Number.isSafeInteger(currentTypeStock) ||
          availableTickets < quantity || currentTypeStock < quantity;
        const purchaseRef = db.collection("purchases").doc(command.purchaseId);

        if (oversold) {
          const outcome: WebhookOutcome = "refund_required_oversold";
          transaction.create(purchaseRef, {
            userId: session.userId,
            userEmail: session.userEmail,
            eventId: session.eventId,
            paymentId: command.paymentId,
            paymentSessionId: sessionId,
            status: "refund_required_oversold",
            items: [{
              ticketType,
              quantity,
              unitPrice: session.unitPrice,
              totalAmount: session.totalAmount,
            }],
            error: "Overselling detected",
            createdAt: Timestamp.fromMillis(command.nowMillis),
            ...approvalAuditFields,
          });
          transaction.update(sessionRef, {
            status: "refund_required",
            refundReason: "oversold",
            providerState: "created",
            paymentId: command.paymentId,
            purchaseId: command.purchaseId,
            updatedAt: Timestamp.fromMillis(command.nowMillis),
            ...approvalAuditFields,
          });
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              outcome,
              "oversold",
              command.purchaseId,
              approvedAfterInitiationExpiry
            )
          );
          return {
            outcome,
            purchaseId: command.purchaseId,
            newlyProcessed: true,
          };
        }

        transaction.update(eventRef!, {
          availableTickets: availableTickets - quantity,
          ...(typeInventory === undefined ? {} : {
            [`inventory.${ticketType}`]: currentTypeStock - quantity,
          }),
          updatedAt: Timestamp.fromMillis(command.nowMillis),
        });
        transaction.create(purchaseRef, {
          userId: session.userId,
          userEmail: session.userEmail,
          eventId: session.eventId,
          paymentId: command.paymentId,
          paymentSessionId: sessionId,
          status: "approved",
          items: [{
            ticketType,
            quantity,
            unitPrice: session.unitPrice,
            totalAmount: session.totalAmount,
          }],
          createdAt: Timestamp.fromMillis(command.nowMillis),
          ...approvalAuditFields,
        });

        const expiresIn = ticketExpirySeconds(
          command.nowMillis,
          event.date,
          event.time
        );
        for (let index = 0; index < quantity; index += 1) {
          const ticketId = command.ticketId(index);
          const ticketRef = db.collection("tickets").doc(ticketId);
          const token = command.signTicket({
            ticketId,
            eventId: session.eventId as string,
            userId: session.userId as string,
            issuedAtMillis: command.nowMillis,
            eventDate: typeof event.date === "string" ? event.date : undefined,
            eventTime: typeof event.time === "string" ? event.time : undefined,
          });
          transaction.create(ticketRef, {
            userId: session.userId,
            userEmail: session.userEmail,
            eventId: session.eventId,
            purchaseId: command.purchaseId,
            ticketType,
            price: session.unitPrice,
            qrCode: token,
            qrExpiresInSeconds: expiresIn,
            validated: false,
            status: "valid",
            purchaseDate: Timestamp.fromMillis(command.nowMillis),
            createdAt: Timestamp.fromMillis(command.nowMillis),
          });
        }
        transaction.update(sessionRef, {
          status: "approved",
          providerState: "created",
          paymentId: command.paymentId,
          purchaseId: command.purchaseId,
          approvedAt: Timestamp.fromMillis(command.nowMillis),
          updatedAt: Timestamp.fromMillis(command.nowMillis),
          errorMessage: FieldValue.delete(),
          ...approvalAuditFields,
        });
        const outcome: WebhookOutcome = "processed";
        transaction.create(
          webhookRef,
          terminalEventData(
            command,
            outcome,
            undefined,
            command.purchaseId,
            approvedAfterInitiationExpiry
          )
        );
        return {
          outcome,
          purchaseId: command.purchaseId,
          newlyProcessed: true,
          email: {
            purchaseId: command.purchaseId,
            userId: session.userId as string,
            eventId: session.eventId as string,
            ticketsCount: quantity,
          },
        };
      });
    },
  };
}
