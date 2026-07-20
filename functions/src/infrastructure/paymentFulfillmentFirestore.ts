/* eslint-disable require-jsdoc, max-len */
import {
  FieldValue,
  Firestore,
  Timestamp,
} from "firebase-admin/firestore";
import {
  FulfillmentCommand,
  FulfillmentResult,
  PaymentFulfillmentRepository,
  PersistedPaymentSession,
  WebhookOutcome,
  classifyPaymentCompatibility,
  isApprovedProviderPayment,
  moneyToCents,
} from "../domain/paymentFulfillment.js";

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
  purchaseId: string | undefined
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

function ticketExpirySeconds(
  nowMillis: number,
  eventDate: unknown,
  eventTime: unknown
) {
  if (typeof eventDate !== "string") return 90 * 24 * 60 * 60;
  const time = typeof eventTime === "string" ? eventTime : "23:59";
  const end = new Date(`${eventDate}T${time}:00`);
  end.setDate(end.getDate() + 1);
  return Math.max(Math.floor((end.getTime() - nowMillis) / 1000), 86400);
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
        if (webhookSnapshot.exists) {
          return existingResult(webhookSnapshot.data() ?? {});
        }

        if (!isApprovedProviderPayment(command.providerPayment)) {
          const outcome: WebhookOutcome = "ignored_not_approved";
          transaction.create(
            webhookRef,
            terminalEventData(command, outcome, "payment_not_approved", undefined)
          );
          return { outcome, newlyProcessed: true };
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
        const eventId = asNonEmptyString(session.eventId);
        const eventRef = eventId ? db.collection("events").doc(eventId) : undefined;
        const eventSnapshot = eventRef ? await transaction.get(eventRef) : undefined;

        const compatibility = classifyPaymentCompatibility({
          paymentId: command.paymentId,
          payment: command.providerPayment,
          session,
          eventExists: Boolean(eventSnapshot?.exists),
        });
        if (compatibility.kind === "idempotent") {
          const outcome: WebhookOutcome = "processed";
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              outcome,
              "idempotent_session",
              compatibility.purchaseId
            )
          );
          return {
            outcome,
            purchaseId: compatibility.purchaseId,
            newlyProcessed: false,
          };
        }
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
          if (session.status !== "approved") {
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
          });
          transaction.update(sessionRef, {
            status: "refund_required",
            refundReason: "oversold",
            providerState: "created",
            paymentId: command.paymentId,
            purchaseId: command.purchaseId,
            updatedAt: Timestamp.fromMillis(command.nowMillis),
          });
          transaction.create(
            webhookRef,
            terminalEventData(
              command,
              outcome,
              "oversold",
              command.purchaseId
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
        });
        const outcome: WebhookOutcome = "processed";
        transaction.create(
          webhookRef,
          terminalEventData(command, outcome, undefined, command.purchaseId)
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
