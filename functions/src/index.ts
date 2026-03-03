import * as Sentry from "@sentry/node";
import cors from "cors";
import { createHmac } from "crypto";
import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { defineSecret, defineString } from "firebase-functions/params";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { onObjectFinalized } from "firebase-functions/v2/storage";
import * as fs from "fs";
import * as jwt from "jsonwebtoken";
import {
  MercadoPagoConfig,
  Payment,
  PaymentRefund,
  Preference,
} from "mercadopago";
import * as nodemailer from "nodemailer";
import * as os from "os";
import * as path from "path";
import sharp from "sharp";

Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

const mercadopagoAccessToken = defineSecret("MP_ACCESS_TOKEN");
const mpWebhookSecret = defineSecret("MP_WEBHOOK_SECRET");
const jwtSecret = defineSecret("JWT_SECRET");
const smtpEmail = defineSecret("SMTP_EMAIL");
const smtpPassword = defineSecret("SMTP_PASSWORD");
const smtpHost = defineString("SMTP_HOST", { default: "smtp.gmail.com" });
const smtpPort = defineString("SMTP_PORT", { default: "465" });
const webBaseUrl = defineString("WEB_BASE_URL", {
  default: "https://ingressosz.web.app",
});

const corsHandler = cors({ origin: true });

admin.initializeApp();

export const health = onRequest((req, res) => {
  corsHandler(req, res, () => {
    const firestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
    const authEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
    const storageEmulator = Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
    const emulator = firestoreEmulator || authEmulator || storageEmulator;
    res.status(200).json({
      emulator,
      firestoreEmulator,
      authEmulator,
      storageEmulator,
    });
  });
});

export const logClientError = onRequest((req, res) => {
  corsHandler(req, res, () => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    let payload: Record<string, unknown> | { payload: unknown };
    if (typeof req.body === "object" && req.body !== null) {
      payload = req.body as Record<string, unknown>;
    } else {
      payload = { payload: req.body };
    }
    logger.warn("ClientError", payload as Record<string, unknown>);
    res.status(204).send("");
  });
});

export const seedDatabase = onCall(
  { secrets: [jwtSecret] },
  async (request) => {
    const db = admin.firestore();
    const batch = db.batch();

    const eventRef1 = db.collection("events").doc();
    batch.set(eventRef1, {
      title: "Festival de Rock 2024",
      description: "O maior festival de rock do ano!",
      date: "2024-12-25",
      time: "18:00",
      location: "Arena Central",
      price: 150.0,
      availableTickets: 500,
      organizerId: request.auth?.uid || "admin",
      imageUrl: "https://placehold.co/600x400/png",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const purchaseRef = db.collection("purchases").doc();
    batch.set(purchaseRef, {
      userId: request.auth?.uid || "user_test",
      eventId: eventRef1.id,
      paymentId: "mock_payment_123",
      status: "approved",
      items: [{ id: "ticket", quantity: 2, unit_price: 150 }],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const secret = jwtSecret.value() || "default-dev-secret";
    for (let i = 0; i < 2; i += 1) {
      const ticketRef = db.collection("tickets").doc();
      const ticketPayload = {
        tid: ticketRef.id,
        eid: eventRef1.id,
        uid: request.auth?.uid || "user_test",
        ts: Date.now() + i,
      };
      const signedToken = jwt.sign(ticketPayload, secret, {
        expiresIn: "365d",
      });
      batch.set(ticketRef, {
        userId: request.auth?.uid || "user_test",
        eventId: eventRef1.id,
        purchaseId: purchaseRef.id,
        qrCode: signedToken,
        validated: false,
        status: "valid",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return { message: "Database seeded successfully" };
  }
);

export const optimizeImage = onObjectFinalized(
  { region: "southamerica-east1" },
  async (event) => {
    const { bucket, name, contentType } = event.data;
    if (!contentType?.startsWith("image/")) {
      logger.log("This is not an image.");
      return;
    }
    if (name.endsWith("_1080.webp")) {
      logger.log("Image is already optimized.");
      return;
    }
    const storageBucket = admin.storage().bucket(bucket);
    const tempFilePath = path.join(os.tmpdir(), path.basename(name));
    const metadata = { contentType: "image/webp" };
    await storageBucket.file(name).download({ destination: tempFilePath });
    const newFileName = `${path.basename(name, path.extname(name))}_1080.webp`;
    const newFilePath = path.join(path.dirname(name), newFileName);
    await sharp(tempFilePath)
      .resize(1080, 1080, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 80 })
      .toFile(path.join(os.tmpdir(), newFileName));
    await storageBucket.upload(path.join(os.tmpdir(), newFileName), {
      destination: newFilePath,
      metadata,
    });
    fs.unlinkSync(tempFilePath);
  }
);

export const createPaymentPreference = onCall(
  { secrets: [mercadopagoAccessToken] },
  async (request) => {
    const accessToken = mercadopagoAccessToken.value();
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    if (!accessToken && isEmulator) {
      return { id: `pref_${Date.now()}` };
    }

    const client = new MercadoPagoConfig({
      accessToken,
    });

    const {
      eventId,
      quantity = 1,
      userId,
    } = request.data as {
      eventId: string;
      quantity?: number;
      userId: string;
    };

    if (!eventId || !userId || quantity < 1) {
      throw new HttpsError("invalid-argument", "Dados inválidos para compra.");
    }

    const eventDoc = await admin
      .firestore()
      .collection("events")
      .doc(eventId)
      .get();

    if (!eventDoc.exists) {
      throw new HttpsError("not-found", "Evento não encontrado.");
    }

    const eventData = eventDoc.data() as {
      availableTickets?: number;
      price?: number;
      title?: string;
    };

    if ((eventData.availableTickets || 0) < quantity) {
      throw new HttpsError(
        "failed-precondition",
        "Ingressos esgotados ou quantidade indisponível."
      );
    }

    const unitPrice = Number(eventData.price || 0);
    const title = `Ingresso: ${eventData.title ?? ""}`;

    const items = [
      {
        id: eventId,
        title,
        quantity,
        unit_price: unitPrice,
        currency_id: "BRL",
      },
    ];

    const preference = new Preference(client);
    try {
      const result = await preference.create({
        body: {
          items,
          payer: {
            email: request.auth?.token.email,
          },
          metadata: { eventId, userId, quantity },
          back_urls: {
            success: `${webBaseUrl.value()}/pagamento/sucesso`,
            failure: `${webBaseUrl.value()}/pagamento/cancelado`,
            pending: `${webBaseUrl.value()}/pagamento/cancelado`,
          },
          auto_return: "approved",
        },
      });
      return { id: result.id };
    } catch (error) {
      logger.error("Erro ao criar preferência de pagamento:", error);
      if (isEmulator) {
        const status = (error as { status?: number } | null)?.status;
        const code = (error as { code?: string } | null)?.code;
        if (
          status === 401 ||
          status === 403 ||
          code === "PA_UNAUTHORIZED_RESULT_FROM_POLICIES"
        ) {
          return { id: `pref_${Date.now()}` };
        }
      }
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Não foi possível criar a preferência de pagamento."
      );
    }
  }
);

export const receiveWebhook = onRequest(
  {
    secrets: [
      mercadopagoAccessToken,
      smtpEmail,
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

    if (mpWebhookSecret.value()) {
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
      const hmac = createHmac("sha256", mpWebhookSecret.value());
      const digest = hmac.update(manifest).digest("hex");

      if (hash !== digest) {
        logger.error(
          "Assinatura do Webhook inválida! Possível tentativa de fraude."
        );
        response.status(403).send("Forbidden");
        return;
      }
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
          const { eventId, userId } = payment.metadata as {
            eventId: string;
            userId: string;
          };
          const items = payment.additional_info.items as Array<{
            quantity: number;
          }>;

          const purchasesRef = admin.firestore().collection("purchases");
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

          const ticketsCount = items.reduce(
            (acc, item) => acc + Number(item.quantity),
            0
          );

          await admin.firestore().runTransaction(async (transaction) => {
            const eventRef = admin
              .firestore()
              .collection("events")
              .doc(eventId);
            const eventDoc = await transaction.get(eventRef);

            if (!eventDoc.exists) {
              throw new Error(
                "Evento não encontrado durante processamento do webhook."
              );
            }

            const data = eventDoc.data() as { availableTickets?: number };
            const currentStock = data.availableTickets || 0;

            if (currentStock < ticketsCount) {
              logger.error("Overselling detected", {
                eventId,
                currentStock,
                ticketsCount,
              });

              const failedPurchaseRef = purchasesRef.doc();
              transaction.set(failedPurchaseRef, {
                userId,
                eventId,
                paymentId,
                status: "refunded_oversold",
                items,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                error: "Overselling detected",
              });

              return;
            }

            transaction.update(eventRef, {
              availableTickets: admin.firestore.FieldValue.increment(
                -ticketsCount
              ),
            });

            const newPurchaseRef = purchasesRef.doc();
            transaction.set(newPurchaseRef, {
              userId,
              eventId,
              paymentId,
              status: "approved",
              items,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const ticketsCollection = admin.firestore().collection("tickets");
            const secret = jwtSecret.value() || "default-dev-secret";

            for (let i = 0; i < ticketsCount; i += 1) {
              const newTicketRef = ticketsCollection.doc();
              const ticketPayload = {
                tid: newTicketRef.id,
                eid: eventId,
                uid: userId,
                ts: Date.now(),
              };
              const signedToken = jwt.sign(ticketPayload, secret, {
                expiresIn: "30d",
              });

              transaction.set(newTicketRef, {
                userId,
                eventId,
                purchaseId: newPurchaseRef.id,
                qrCode: signedToken,
                validated: false,
                status: "valid",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          });

          logger.info(`Compra processada para ${userId} no evento ${eventId}.`);

          try {
            const userRecord = await admin.auth().getUser(userId);
            if (userRecord.email) {
              const subject = "Seus ingressos chegaram! - IngressosZ";
              const html =
                `Olá! Seus ${ticketsCount} ingressos foram confirmados.` +
                " Acesse o app para visualizar.";
              await sendEmail(userRecord.email, subject, html);
            }
          } catch (emailError) {
            logger.error("Erro ao enviar email de confirmação:", emailError);
          }
        }
      } catch (error) {
        logger.error("Erro ao processar notificação de pagamento:", error);
      }
    }

    response.status(200).send("OK");
  }
);

export const validateTicket = onRequest(
  { secrets: [jwtSecret] },
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith("Bearer ")) {
          res.status(401).json({ success: false, message: "Não autorizado" });
          return;
        }

        const token = authHeader.split("Bearer ")[1];
        let decodedToken: admin.auth.DecodedIdToken;
        try {
          decodedToken = await admin.auth().verifyIdToken(token);
        } catch {
          res.status(401).json({ success: false, message: "Token inválido" });
          return;
        }
        const isAdmin = decodedToken.admin === true;
        const role = (decodedToken as unknown as { role?: string }).role;
        let hasPermission =
          isAdmin ||
          role === "validator" ||
          role === "organizer" ||
          role === "admin";
        const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
        if (!hasPermission && isEmulator) {
          try {
            const userDoc = await admin
              .firestore()
              .collection("users")
              .doc(decodedToken.uid)
              .get();
            const userRole = (userDoc.data() as { role?: string } | null)?.role;
            if (
              typeof userRole === "string" &&
              ["validator", "organizer", "admin"].includes(
                userRole.toLowerCase()
              )
            ) {
              hasPermission = true;
            }
          } catch (error) {
            void error;
          }
        }
        if (!hasPermission) {
          res.status(403).json({ success: false, message: "Não autorizado" });
          return;
        }

        const { qrCode } = req.body as { qrCode?: string };
        if (!qrCode) {
          res
            .status(400)
            .json({ success: false, message: "QR Code não fornecido" });
          return;
        }

        const secret = jwtSecret.value() || "default-dev-secret";
        let decoded: jwt.JwtPayload | string;
        try {
          decoded = jwt.verify(qrCode, secret);
        } catch (e) {
          logger.warn(`Falha na verificação do token JWT: ${e}`);
          try {
            const legacyData = JSON.parse(qrCode);
            if (legacyData.type === "INGRESSOSZ_TICKET") {
              res.status(400).json({
                success: false,
                message: "Formato de ingresso antigo/inválido",
              });
              return;
            }
          } catch (parseError) {
            void parseError;
          }
          res.status(403).json({
            success: false,
            message: "QR Code inválido ou expirado",
          });
          return;
        }

        const {
          tid: ticketId,
          eid: eventId,
          uid: userId,
        } = decoded as {
          tid: string;
          eid: string;
          uid: string;
        };

        if (!ticketId || !eventId) {
          res.status(400).json({
            success: false,
            message: "Conteúdo do QR Code inválido",
          });
          return;
        }

        const ticketRef = admin.firestore().collection("tickets").doc(ticketId);
        const ticketSnap = await ticketRef.get();

        if (!ticketSnap.exists) {
          res.status(404).json({
            success: false,
            message: "Ingresso não encontrado no sistema",
          });
          return;
        }

        const ticket = ticketSnap.data() as {
          qrCode: string;
          validated?: boolean;
          validatedAt?: admin.firestore.Timestamp;
        } | null;

        if (!ticket) {
          res.status(500).json({
            success: false,
            message: "Erro ao recuperar dados do ingresso",
          });
          return;
        }

        if (ticket.qrCode !== qrCode) {
          res.status(403).json({
            success: false,
            message: "Este QR Code foi revogado ou regenerado",
          });
          return;
        }

        if (ticket.validated) {
          res.status(400).json({
            success: false,
            status: "used",
            message: "Ingresso já utilizado",
            usedAt: ticket.validatedAt,
          });
          return;
        }

        await ticketRef.update({
          validated: true,
          validatedAt: admin.firestore.FieldValue.serverTimestamp(),
          validatedBy: "api",
        });

        const eventSnap = await admin
          .firestore()
          .collection("events")
          .doc(eventId)
          .get();
        const event = eventSnap.data() as {
          title?: string;
          date?: string;
          time?: string;
        } | null;
        let holderEmail = "N/A";

        try {
          const userRecord = await admin.auth().getUser(userId);
          holderEmail = userRecord.email || "N/A";
        } catch {
          logger.warn("Usuário do ingresso não encontrado:", userId);
        }

        res.status(200).json({
          success: true,
          ticket: {
            eventTitle: event?.title || "Evento Desconhecido",
            ticketType: "Geral",
            holderEmail,
            eventDate: event?.date,
            eventTime: event?.time,
          },
        });
      } catch (error) {
        logger.error("Erro na validação:", error);
        res.status(500).json({ success: false, message: "Erro interno" });
      }
    });
  }
);

export const setAdminRole = onCall(async (request) => {
  if (request.auth?.token.admin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem realizar esta operação."
    );
  }

  const { uid } = request.data as { uid?: string };

  if (!uid) {
    throw new HttpsError("invalid-argument", "O UID do usuário é obrigatório.");
  }

  try {
    await admin.auth().setCustomUserClaims(uid, { admin: true, role: "admin" });
    await admin.auth().revokeRefreshTokens(uid);
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .set({ role: "admin" }, { merge: true });
    return { success: true, message: `Usuário ${uid} agora é administrador.` };
  } catch (error) {
    logger.error("Erro ao definir admin:", error);
    throw new HttpsError("internal", "Erro ao definir privilégios de admin.");
  }
});

export const setUserRole = onCall(async (request) => {
  if (request.auth?.token.admin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem realizar esta operação."
    );
  }
  const { uid, role } = request.data as {
    uid?: string;
    role?: "organizer" | "validator" | "admin";
  };
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "UID e role são obrigatórios.");
  }
  try {
    await admin.auth().setCustomUserClaims(uid, {
      role,
      admin: role === "admin",
    });
    await admin.auth().revokeRefreshTokens(uid);
    await admin
      .firestore()
      .collection("users")
      .doc(uid)
      .set({ role }, { merge: true });
    return { success: true, message: `Usuário ${uid} agora é ${role}.` };
  } catch (error) {
    logger.error("Erro ao definir role:", error);
    throw new HttpsError("internal", "Erro ao definir o papel do usuário.");
  }
});

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const email = smtpEmail.value();
    const password = smtpPassword.value();
    const host = smtpHost.value();
    const port = parseInt(smtpPort.value(), 10);

    if (!email || !password) {
      logger.warn("Credenciais de email não configuradas. Email não enviado.");
      return;
    }

    const transporter = nodemailer.createTransport({
      host,
      port,
      secure: port === 465,
      auth: {
        user: email,
        pass: password,
      },
    });

    await transporter.sendMail({
      from: `"IngressosZ" <${email}>`,
      to,
      subject,
      html,
    });

    logger.info(`Email enviado com sucesso para: ${to}`);
  } catch (error) {
    logger.error("Erro ao enviar email:", error);
  }
};

export const refundPayment = onCall(
  { secrets: [mercadopagoAccessToken] },
  async (request) => {
    if (request.auth?.token.admin !== true) {
      throw new HttpsError(
        "permission-denied",
        "Apenas admins podem reembolsar."
      );
    }

    const { paymentId } = request.data as { paymentId: string };

    const client = new MercadoPagoConfig({
      accessToken: mercadopagoAccessToken.value(),
    });

    const refund = new PaymentRefund(client);

    try {
      await refund.create({ payment_id: paymentId });

      const purchasesRef = admin.firestore().collection("purchases");
      const snapshot = await purchasesRef
        .where("paymentId", "==", paymentId)
        .get();

      if (!snapshot.empty) {
        const purchaseDoc = snapshot.docs[0];
        await purchaseDoc.ref.update({ status: "refunded" });

        const ticketsRef = admin.firestore().collection("tickets");
        const ticketsSnapshot = await ticketsRef
          .where("purchaseId", "==", purchaseDoc.id)
          .get();

        const batch = admin.firestore().batch();
        ticketsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { status: "cancelled" });
        });
        await batch.commit();
      } else {
        logger.warn("Compra não encontrada para atualização de reembolso.", {
          paymentId,
        });
      }

      return { success: true, message: "Reembolso processado com sucesso." };
    } catch (error) {
      logger.error("Erro ao processar reembolso:", error);
      throw new HttpsError(
        "internal",
        "Erro ao processar reembolso no Mercado Pago."
      );
    }
  }
);
