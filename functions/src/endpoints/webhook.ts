import { createHmac } from "crypto";
import admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import jwt from "jsonwebtoken";
import { MercadoPagoConfig, Payment } from "mercadopago";
import {
  jwtSecret,
  mercadopagoAccessToken,
  mpWebhookSecret,
  smtpPassword,
} from "../config/params.js";
import { planSaleInventoryUpdate } from "../domain/inventory.js";
import { sendPurchaseEmail } from "./email.js";
const ensureUserFromEmail = async (email: string) => {
  let accountCreated = false;
  let userRecord: admin.auth.UserRecord;
  try {
    userRecord = await admin.auth().getUserByEmail(email);
  } catch (error) {
    const code = (error as { code?: string } | null)?.code;
    if (code === "auth/user-not-found") {
      userRecord = await admin.auth().createUser({
        email,
        emailVerified: false,
      });
      accountCreated = true;
    } else {
      throw error;
    }
  }

  const userRef = getFirestore().collection("users").doc(userRecord.uid);
  const userSnap = await userRef.get();
  if (!userSnap.exists) {
    await userRef.set({
      uid: userRecord.uid,
      email: userRecord.email || email,
      displayName: userRecord.displayName || "",
      phone: userRecord.phoneNumber || "",
      role: "user",
      avatarUrl: userRecord.photoURL || "",
      createdAt: FieldValue.serverTimestamp(),
    });
  }

  return { userId: userRecord.uid, accountCreated };
};

export const receiveWebhook = onRequest(
  {
    secrets: [
      mercadopagoAccessToken,
      smtpPassword,
      mpWebhookSecret,
      jwtSecret,
    ],
  },
  async (request, response) => {
    const client = new MercadoPagoConfig({
      accessToken: mercadopagoAccessToken.value(),
    });

    logger.info("Webhook do Mercado Pago recebido");

    const xSignature = request.headers["x-signature"];
    const xRequestId = request.headers["x-request-id"];
    const dataId = (request.body?.data as { id?: string } | undefined)?.id;

    const webhookSecret = mpWebhookSecret.value();
    if (!webhookSecret) {
      // Secret obrigatorio em producao; rejeitar webhooks forjados.
      logger.error(
        "MP_WEBHOOK_SECRET não configurado. Rejeitando webhook por segurança."
      );
      response.status(403).send("Forbidden");
      return;
    }

    if (!xSignature || !xRequestId || !dataId) {
      logger.warn("Webhook sem assinatura ou ID.");
      response.status(403).send("Forbidden");
      return;
    }

    const parts = String(xSignature).split(",");
    let ts: string | undefined;
    let hash: string | undefined;

    for (const part of parts) {
      const [key, value] = part.split("=");
      if (!key || !value) continue;
      const trimmedKey = key.trim();
      const trimmedValue = value.trim();
      if (trimmedKey === "ts") ts = trimmedValue;
      if (trimmedKey === "v1") hash = trimmedValue;
    }

    const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
    const hmac = createHmac("sha256", webhookSecret);
    const digest = hmac.update(manifest).digest("hex");

    if (hash !== digest) {
      logger.error(
        "Assinatura do Webhook inválida! Possível tentativa de fraude."
      );
      response.status(403).send("Forbidden");
      return;
    }

    const { body } = request;

    if (body.type === "payment") {
      const paymentId = body.data.id;
      logger.info(`Pagamento recebido: ${paymentId}`);

      try {
        const payment = await new Payment(client).get({ id: paymentId });

        if (
          payment.status === "approved" &&
          payment.metadata &&
          payment.additional_info?.items
        ) {
          const meta =
            payment.metadata &&
            typeof payment.metadata === "object" ?
              (payment.metadata as Record<string, unknown>) :
              {};
          const eventId =
            typeof meta.event_id === "string" ?
              meta.event_id :
              typeof meta.eventId === "string" ?
                meta.eventId :
                undefined;
          const metadataUserId =
            typeof meta.user_id === "string" ?
              meta.user_id :
              typeof meta.userId === "string" ?
                meta.userId :
                undefined;
          const metadataEmail =
            typeof meta.user_email === "string" ?
              meta.user_email :
              typeof meta.userEmail === "string" ?
                meta.userEmail :
                undefined;
          const metadataTicketType =
            typeof meta.ticket_type === "string" ?
              meta.ticket_type :
              typeof meta.ticketType === "string" ?
                meta.ticketType :
                undefined;
          const metadataPaymentSessionId =
            typeof meta.payment_session_id === "string" ?
              meta.payment_session_id :
              typeof meta.paymentSessionId === "string" ?
                meta.paymentSessionId :
                undefined;

          if (!eventId) {
            logger.warn(
              "Webhook sem eventId no metadata. Ignorando.",
              { paymentId }
            );
            response.status(200).send("OK");
            return;
          }
          let resolvedTicketType = "standard";
          if (
            metadataTicketType &&
            ["standard", "vip", "premium"].includes(metadataTicketType)
          ) {
            resolvedTicketType = metadataTicketType;
          }
          const paymentSessionId = metadataPaymentSessionId;
          const additionalPayer = payment.additional_info?.payer as {
            email?: string;
          } | null;
          const payerEmail =
            (payment.payer as { email?: string } | null)?.email ||
            additionalPayer?.email;
          let resolvedUserId = metadataUserId;
          const resolvedEmail = metadataEmail || payerEmail || "";
          let accountCreated = false;
          if (!resolvedUserId && resolvedEmail) {
            const result = await ensureUserFromEmail(resolvedEmail);
            resolvedUserId = result.userId;
            accountCreated = result.accountCreated;
          }

          if (!eventId || !resolvedUserId) {
            logger.warn("Pagamento sem dados de usuário válidos", {
              paymentId,
              eventId,
              resolvedUserId,
            });
            response.status(200).send("OK");
            return;
          }

          const items = payment.additional_info.items as Array<{
            quantity: number;
          }>;

          const purchasesRef = getFirestore().collection("purchases");

          // Idempotency guard: atomically claim paymentSession so concurrent
          // webhooks for the same paymentId cannot both proceed past this
          // point.
          if (paymentSessionId) {
            const sessionRef = getFirestore()
              .collection("paymentSessions")
              .doc(paymentSessionId);
            let alreadyProcessed = false;
            await getFirestore().runTransaction(async (txn) => {
              const sessionSnap = await txn.get(sessionRef);
              if (!sessionSnap.exists) return;
              const sessionStatus = (
                sessionSnap.data() as { status?: string }
              )?.status;
              if (sessionStatus && sessionStatus !== "pending") {
                alreadyProcessed = true;
                return;
              }
              txn.update(sessionRef, {
                status: "processing",
                updatedAt: FieldValue.serverTimestamp(),
              });
            });
            if (alreadyProcessed) {
              logger.info(
                `Pagamento ${paymentId} ja processado ` +
                "(paymentSession). Ignorando."
              );
              response.status(200).send("OK");
              return;
            }
          } else {
            // Fallback for webhooks without paymentSessionId:
            // query by paymentId.
            const snapshot = await purchasesRef
              .where("paymentId", "==", paymentId)
              .get();
            if (!snapshot.empty) {
              logger.info(
                `Pagamento ${paymentId} já processado anteriormente. Ignorando.`
              );
              response.status(200).send("OK");
              return;
            }
          }

          const ticketsCount = items.reduce(
            (acc, item) => acc + Number(item.quantity),
            0
          );

          const newPurchaseRef = purchasesRef.doc();
          let oversold = false;
          let failedPurchaseId = "";
          await getFirestore().runTransaction(async (transaction) => {
            const eventRef = getFirestore()
              .collection("events")
              .doc(eventId);
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists) {
              throw new Error(
                "Evento não encontrado durante processamento do webhook."
              );
            }

            const data = eventDoc.data() as {
              availableTickets?: number;
              inventory?: Record<string, number>;
              date?: string;
              time?: string;
              price?: number;
              pricing?: Record<string, number>;
            };
            const inventoryPlan = planSaleInventoryUpdate(
              data,
              resolvedTicketType,
              ticketsCount
            );

            if (inventoryPlan.oversold) {
              logger.error("Overselling detected", {
                eventId,
                currentStock: inventoryPlan.currentStock,
                currentTypeStock: inventoryPlan.currentTypeStock,
                resolvedTicketType,
                ticketsCount,
              });

              const failedPurchaseRef = purchasesRef.doc();
              oversold = true;
              failedPurchaseId = failedPurchaseRef.id;
              transaction.set(failedPurchaseRef, {
                userId: resolvedUserId,
                eventId,
                paymentId,
                status: "refunded_oversold",
                items,
                userEmail: resolvedEmail,
                accountCreated,
                createdAt: FieldValue.serverTimestamp(),
                error: "Overselling detected",
              });

              return;
            }

            const updates: Record<string, string | number | FieldValue> = {
              availableTickets: FieldValue.increment(-ticketsCount),
              updatedAt: FieldValue.serverTimestamp(),
            };

            if (
              data.inventory &&
              data.inventory[resolvedTicketType] !== undefined
            ) {
              updates[`inventory.${resolvedTicketType}`] =
                FieldValue.increment(-ticketsCount);
            }

            transaction.update(eventRef, updates);

            transaction.set(newPurchaseRef, {
              userId: resolvedUserId,
              eventId,
              paymentId,
              status: "approved",
              items,
              userEmail: resolvedEmail,
              accountCreated,
              createdAt: FieldValue.serverTimestamp(),
            });

            const ticketsCollection = getFirestore().collection("tickets");
            const jwtRawSecret = jwtSecret.value();
            if (!jwtRawSecret) {
              logger.error(
                "JWT_SECRET não configurado. Tickets não serão emitidos."
              );
              throw new Error("JWT_SECRET ausente em produção.");
            }
            const secret = jwtRawSecret;

            let ticketExpiresInSeconds: number;
            if (data.date) {
              const timeStr = data.time || "23:59";
              const eventDateTime = new Date(`${data.date}T${timeStr}:00`);
              eventDateTime.setDate(eventDateTime.getDate() + 1);
              const secsUntilExpiry = Math.floor(
                (eventDateTime.getTime() - Date.now()) / 1000
              );
              ticketExpiresInSeconds = Math.max(secsUntilExpiry, 86400);
            } else {
              ticketExpiresInSeconds = 90 * 24 * 60 * 60;
            }

            for (let i = 0; i < ticketsCount; i += 1) {
              const newTicketRef = ticketsCollection.doc();
              const ticketPayload = {
                tid: newTicketRef.id,
                eid: eventId,
                uid: resolvedUserId,
                ts: Date.now(),
              };
              const signedToken = jwt.sign(ticketPayload, secret, {
                expiresIn: ticketExpiresInSeconds,
              });

              transaction.set(newTicketRef, {
                userId: resolvedUserId,
                eventId,
                purchaseId: newPurchaseRef.id,
                ticketType: resolvedTicketType,
                price: inventoryPlan.unitPrice,
                userEmail: resolvedEmail,
                qrCode: signedToken,
                validated: false,
                status: "valid",
                purchaseDate: FieldValue.serverTimestamp(),
                createdAt: FieldValue.serverTimestamp(),
              });
            }
          });

          if (paymentSessionId) {
            await getFirestore()
              .collection("paymentSessions")
              .doc(paymentSessionId)
              .set(
                {
                  status: oversold ? "failed" : "approved",
                  paymentId,
                  purchaseId: oversold ? failedPurchaseId : newPurchaseRef.id,
                  ticketType: resolvedTicketType,
                  updatedAt: FieldValue.serverTimestamp(),
                  errorMessage: oversold ? "Overselling detected" : "",
                },
                { merge: true }
              );
          }

          if (oversold) {
            logger.error("Pagamento aprovado com oversell", {
              paymentId,
              eventId,
            });
            response.status(200).send("OK");
            return;
          }

          logger.info(
            `Compra processada para ${resolvedUserId} no evento ${eventId}.`
          );

          // Email is best-effort: failure must not affect ticket generation or
          // cause MP to retry the webhook (which would duplicate tickets).
          sendPurchaseEmail(newPurchaseRef.id, {
            userId: resolvedUserId,
            eventId,
            ticketsCount,
            accountCreated,
          }).catch((emailErr) => {
            logger.error(
              "Falha ao enviar email de confirmacao para compra " +
              `${newPurchaseRef.id}:`,
              emailErr
            );
          });
        }
      } catch (error) {
        // Real processing failure; return 500 so Mercado Pago retries webhook.
        logger.error("Erro ao processar notificação de pagamento:", {
          error,
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          paymentId,
          notificationType: body?.type,
          notificationAction: body?.action,
        });
        response.status(500).send("Internal Server Error");
        return;
      }
    }

    response.status(200).send("OK");
  }
);
