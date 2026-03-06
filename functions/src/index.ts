import * as Sentry from "@sentry/node";
import cors from "cors";
import { createHmac } from "crypto";
import * as admin from "firebase-admin";
import { FieldValue } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
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

const webBase = String(webBaseUrl.value() || "").trim();
const allowedOrigins = new Set(
  [webBase, "http://localhost:5173", "http://127.0.0.1:5173"]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ""))
);
const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalized = origin.replace(/\/+$/, "");
    callback(null, allowedOrigins.has(normalized));
  },
});

if (typeof admin.initializeApp === "function") {
  admin.initializeApp();
}

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
      createdAt: FieldValue.serverTimestamp(),
    });

    const purchaseRef = db.collection("purchases").doc();
    batch.set(purchaseRef, {
      userId: request.auth?.uid || "user_test",
      eventId: eventRef1.id,
      paymentId: "mock_payment_123",
      status: "approved",
      items: [{ id: "ticket", quantity: 2, unit_price: 150 }],
      createdAt: FieldValue.serverTimestamp(),
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
        createdAt: FieldValue.serverTimestamp(),
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
      userEmail,
    } = request.data as {
      eventId: string;
      quantity?: number;
      userId: string;
      userEmail?: string;
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
      const payerEmail = request.auth?.token.email || userEmail;
      const result = await preference.create({
        body: {
          items,
          payer: {
            email: payerEmail,
          },
          metadata: { eventId, userId, quantity, userEmail: payerEmail },
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

export const createPaymentPreferencePublic = onRequest(
  { secrets: [mercadopagoAccessToken] },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const accessToken = mercadopagoAccessToken.value();
      const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
      if (!accessToken && isEmulator) {
        res.status(200).json({ id: `pref_${Date.now()}` });
        return;
      }

      const {
        eventId,
        quantity = 1,
        userEmail,
      } = req.body as {
        eventId?: string;
        quantity?: number;
        userEmail?: string;
      };

      if (!eventId || !userEmail || quantity < 1) {
        res.status(400).json({ message: "Dados inválidos para compra." });
        return;
      }

      const eventDoc = await admin
        .firestore()
        .collection("events")
        .doc(eventId)
        .get();

      if (!eventDoc.exists) {
        res.status(404).json({ message: "Evento não encontrado." });
        return;
      }

      const eventData = eventDoc.data() as {
        availableTickets?: number;
        price?: number;
        title?: string;
      };

      if ((eventData.availableTickets || 0) < quantity) {
        res
          .status(412)
          .json({ message: "Ingressos esgotados ou quantidade indisponível." });
        return;
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

      const client = new MercadoPagoConfig({
        accessToken,
      });

      const preference = new Preference(client);
      try {
        const result = await preference.create({
          body: {
            items,
            payer: {
              email: userEmail,
            },
            metadata: { eventId, quantity, userEmail },
            back_urls: {
              success: `${webBaseUrl.value()}/pagamento/sucesso`,
              failure: `${webBaseUrl.value()}/pagamento/cancelado`,
              pending: `${webBaseUrl.value()}/pagamento/cancelado`,
            },
            auto_return: "approved",
          },
        });
        res.status(200).json({ id: result.id });
      } catch (error) {
        logger.error("Erro ao criar preferência pública:", error);
        res.status(500).json({ message: "Erro ao criar preferência." });
      }
    });
  }
);

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

  const userRef = admin.firestore().collection("users").doc(userRecord.uid);
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
          const {
            eventId,
            userId: metadataUserId,
            userEmail: metadataEmail,
          } = payment.metadata as {
            eventId: string;
            userId?: string;
            userEmail?: string;
          };
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

          const newPurchaseRef = purchasesRef.doc();
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
                userId: resolvedUserId,
                eventId,
                paymentId,
                status: "refunded_oversold",
                items,
                userEmail: resolvedEmail,
                accountCreated,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                error: "Overselling detected",
              });

              return;
            }

            transaction.update(eventRef, {
              availableTickets: FieldValue.increment(-ticketsCount),
            });

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

            const ticketsCollection = admin.firestore().collection("tickets");
            const secret = jwtSecret.value() || "default-dev-secret";

            for (let i = 0; i < ticketsCount; i += 1) {
              const newTicketRef = ticketsCollection.doc();
              const ticketPayload = {
                tid: newTicketRef.id,
                eid: eventId,
                uid: resolvedUserId,
                ts: Date.now(),
              };
              const signedToken = jwt.sign(ticketPayload, secret, {
                expiresIn: "30d",
              });

              transaction.set(newTicketRef, {
                userId: resolvedUserId,
                eventId,
                purchaseId: newPurchaseRef.id,
                qrCode: signedToken,
                validated: false,
                status: "valid",
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          });

          logger.info(
            `Compra processada para ${resolvedUserId} no evento ${eventId}.`
          );

          await sendPurchaseEmail(newPurchaseRef.id, {
            userId: resolvedUserId,
            eventId,
            ticketsCount,
            accountCreated,
          });
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
          validatedAt: FieldValue.serverTimestamp(),
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

export const onTicketCreated = onDocumentCreated(
  { document: "tickets/{ticketId}", secrets: [smtpEmail, smtpPassword] },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const data = snapshot.data() as {
      userId?: string;
      eventId?: string;
      purchaseId?: string;
      purchaseDate?: admin.firestore.Timestamp;
      userEmail?: string;
    };

    const updates: Record<string, unknown> = {};

    if (!data.purchaseDate) {
      updates.purchaseDate = FieldValue.serverTimestamp();
    }

    if (!data.userEmail && data.userId) {
      try {
        const userRecord = await admin.auth().getUser(data.userId);
        if (userRecord.email) {
          updates.userEmail = userRecord.email;
        }
      } catch (error) {
        logger.warn("Falha ao buscar email do usuário", error);
      }
    }

    if (Object.keys(updates).length > 0) {
      await snapshot.ref.set(updates, { merge: true });
    }

    if (data.eventId) {
      try {
        await admin
          .firestore()
          .collection("events")
          .doc(data.eventId)
          .update({
            soldTickets: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });
      } catch (error) {
        logger.warn("Falha ao atualizar contadores do evento", error);
      }
    }

    if (data.purchaseId) {
      await sendPurchaseEmail(data.purchaseId, {
        userId: data.userId,
        eventId: data.eventId,
        ticketsCount: 1,
      });
    }
  }
);

const sendTicketEmail = async (
  userId: string,
  eventId: string,
  ticketsCount: number,
  options?: { accountCreated?: boolean }
) => {
  try {
    const [userRecord, eventSnap] = await Promise.all([
      admin.auth().getUser(userId),
      admin.firestore().collection("events").doc(eventId).get(),
    ]);

    if (!userRecord.email) {
      logger.warn("Usuário sem email para envio de ingresso", { userId });
      return;
    }

    const event = eventSnap.data() as
      | { title?: string; date?: string; time?: string; location?: string }
      | undefined;
    const eventTitle = event?.title || "IngressosZ";
    let dateText = "";
    if (event?.date) {
      dateText = new Date(event.date).toLocaleDateString("pt-BR");
    }
    const timeText = event?.time ? ` ${event.time}` : "";
    const locationText = event?.location || "";
    const infoLines = [
      event?.date ? `Data: ${dateText}${timeText}` : "",
      locationText ? `Local: ${locationText}` : "",
    ].filter(Boolean);
    let accountLine = "";
    if (options?.accountCreated && userRecord.email) {
      try {
        const link = await admin
          .auth()
          .generatePasswordResetLink(userRecord.email, {
            url: `${webBaseUrl.value()}/login`,
          });
        accountLine =
          "<p>Sua conta foi criada automaticamente.</p>" +
          `<p>Defina sua senha aqui: <a href="${link}">Criar senha</a></p>`;
      } catch (error) {
        logger.warn("Falha ao gerar link de senha", error);
      }
    }

    const subject = `Ingressos confirmados - ${eventTitle}`;
    const html =
      `<p>Olá! Seus ${ticketsCount} ingressos foram confirmados.</p>` +
      `<p>Evento: ${eventTitle}</p>` +
      (infoLines.length ? `<p>${infoLines.join("<br/>")}</p>` : "") +
      accountLine +
      `<p>Acesse ${webBaseUrl.value()}/meus-ingressos para visualizar.</p>`;

    await sendEmail(userRecord.email, subject, html);
  } catch (error) {
    logger.error("Erro ao preparar email de ingresso:", error);
  }
};

const sendPurchaseEmail = async (
  purchaseId: string,
  fallback?: {
    userId?: string;
    eventId?: string;
    ticketsCount?: number;
    accountCreated?: boolean;
  }
) => {
  const purchaseRef = admin.firestore().collection("purchases").doc(purchaseId);
  let shouldSend = false;
  let userId = fallback?.userId;
  let eventId = fallback?.eventId;
  let ticketsCount = fallback?.ticketsCount;
  let accountCreated = fallback?.accountCreated;

  try {
    await admin.firestore().runTransaction(async (transaction) => {
      const purchaseSnap = await transaction.get(purchaseRef);
      if (!purchaseSnap.exists) {
        return;
      }

      const purchase = purchaseSnap.data() as {
        emailSent?: boolean;
        userId?: string;
        eventId?: string;
        items?: Array<{ quantity?: number }>;
        accountCreated?: boolean;
      };

      if (purchase.emailSent) {
        return;
      }

      userId = purchase.userId ?? userId;
      eventId = purchase.eventId ?? eventId;
      accountCreated = purchase.accountCreated ?? accountCreated;
      if (!ticketsCount && purchase.items?.length) {
        ticketsCount = purchase.items.reduce(
          (acc, item) => acc + Number(item.quantity || 0),
          0
        );
      }
      if (!ticketsCount) {
        ticketsCount = 1;
      }

      transaction.update(purchaseRef, {
        emailSent: true,
        emailSentAt: FieldValue.serverTimestamp(),
      });
      shouldSend = true;
    });
  } catch (error) {
    logger.error("Erro ao preparar envio de email da compra:", error);
    return;
  }

  if (!shouldSend) {
    return;
  }

  if (!userId || !eventId) {
    logger.warn("Dados insuficientes para email da compra", {
      purchaseId,
      userId,
      eventId,
    });
    return;
  }

  await sendTicketEmail(userId, eventId, ticketsCount ?? 1, {
    accountCreated: Boolean(accountCreated),
  });
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const email = smtpEmail.value();
    const password = smtpPassword.value();
    const host = smtpHost.value();
    const port = parseInt(smtpPort.value(), 10);
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    const isLocalHost = host === "localhost" || host === "127.0.0.1";
    const requiresAuth = !(isEmulator && isLocalHost);
    const fromEmail =
      email || (isEmulator && isLocalHost ? "no-reply@localhost" : "");

    if (!fromEmail || (requiresAuth && (!email || !password))) {
      logger.warn("Credenciais de email não configuradas. Email não enviado.");
      return;
    }

    const transportOptions: Record<string, unknown> = {
      host,
      port,
      secure: port === 465,
    };

    if (requiresAuth && email && password) {
      transportOptions.auth = {
        user: email,
        pass: password,
      };
    }

    const transporter = nodemailer.createTransport(
      transportOptions as nodemailer.TransportOptions
    );

    await transporter.sendMail({
      from: `"IngressosZ" <${fromEmail}>`,
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
