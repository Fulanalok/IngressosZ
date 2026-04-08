import * as Sentry from "@sentry/node";
import cors from "cors";
import { createHmac } from "crypto";
import * as admin from "firebase-admin";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { defineSecret, defineString } from "firebase-functions/params";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { setGlobalOptions } from "firebase-functions/v2/options";
import { onSchedule } from "firebase-functions/v2/scheduler";
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

const sentryDsn = defineString("SENTRY_DSN");

Sentry.init({
  dsn: sentryDsn.value() || process.env.SENTRY_DSN,
  integrations: [],
  tracesSampleRate: 1.0,
  profilesSampleRate: 1.0,
});

setGlobalOptions({ region: "southamerica-east1" });
const mercadopagoAccessToken = defineSecret("MP_ACCESS_TOKEN");
const mpWebhookSecret = defineSecret("MP_WEBHOOK_SECRET");
const jwtSecret = defineSecret("JWT_SECRET");
const smtpEmail = defineSecret("SMTP_EMAIL");
const smtpPassword = defineSecret("SMTP_PASSWORD");
const recaptchaV2Secret = defineSecret("RECAPTCHA_V2_SECRET");
const smtpHost = defineString("SMTP_HOST", { default: "smtp.gmail.com" });
const smtpPort = defineString("SMTP_PORT", { default: "465" });
const webBaseUrl = defineString("WEB_BASE_URL", {
  default: "https://ingressosz.web.app",
});

const webBase = String(webBaseUrl.value() || "").trim();
const allowedOrigins = new Set(
  [webBase, "http://localhost:5173", "http://127.0.0.1:5173",
    "http://localhost:5174", "http://127.0.0.1:5174"]
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
    // Robust localhost check for any port
    const isLocalhost =
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized);
    if (isLocalhost || allowedOrigins.has(normalized)) {
      callback(null, true);
      return;
    }
    callback(null, false);
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

export const logClientError = onCall((request) => {
  const payload = request.data as Record<string, unknown>;
  const uid = request.auth?.uid || payload.uid || "anonymous";

  logger.warn("ClientError", {
    ...payload,
    uid,
    ip: request.rawRequest.ip,
  });

  return { success: true };
});

export const verifyRecaptchaV2 = onCall(
  { secrets: [recaptchaV2Secret], cors: true },
  async (request) => {
    const token = (request.data as { token?: string } | null)?.token;
    if (!token || typeof token !== "string") {
      throw new HttpsError("invalid-argument", "Token do reCAPTCHA ausente.");
    }
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    const testSecret = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
    const secret = recaptchaV2Secret.value() || (isEmulator ? testSecret : "");
    if (!secret) {
      throw new HttpsError(
        "failed-precondition",
        "RECAPTCHA_V2_SECRET não configurado."
      );
    }

    const body = new URLSearchParams({
      secret,
      response: token,
    });
    const verifyResponse = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );
    const data = (await verifyResponse.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };
    if (!data.success) {
      throw new HttpsError("permission-denied", "reCAPTCHA inválido.", {
        codes: data["error-codes"] ?? [],
      });
    }
    return { success: true };
  }
);

export const seedDatabase = onCall(
  { secrets: [jwtSecret] },
  async (request) => {
    const db = getFirestore();
    const batch = db.batch();

    const eventRef1 = db.collection("events").doc();
    const organizerId = request.auth?.uid || "admin";
    batch.set(eventRef1, {
      title: "Festival de Rock 2024",
      description: "O maior festival de rock do ano!",
      date: "2024-12-25",
      time: "18:00",
      location: "Arena Central",
      address: "Av. Central, 1000 - São Paulo - SP",
      price: 150.0,
      maxTickets: 500,
      availableTickets: 500,
      inventory: { standard: 300, vip: 100, premium: 100 },
      pricing: { standard: 150, vip: 220, premium: 300 },
      category: "Música",
      organizerId,
      createdBy: organizerId,
      image: "https://placehold.co/600x400/png",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const purchaseRef = db.collection("purchases").doc();
    batch.set(purchaseRef, {
      userId: organizerId,
      eventId: eventRef1.id,
      paymentId: "mock_payment_123",
      status: "approved",
      items: [{ id: "ticket", quantity: 2, unit_price: 150 }],
      userEmail: request.auth?.token?.email || "user_test@example.com",
      createdAt: FieldValue.serverTimestamp(),
    });

    const isEmulatorSeed = process.env.FUNCTIONS_EMULATOR === "true";
    const secret =
      jwtSecret.value() || (isEmulatorSeed ? "default-dev-secret" : null);
    if (!secret) {
      throw new HttpsError("internal", "JWT_SECRET não configurado.");
    }
    for (let i = 0; i < 2; i += 1) {
      const ticketRef = db.collection("tickets").doc();
      const ticketPayload = {
        tid: ticketRef.id,
        eid: eventRef1.id,
        uid: organizerId,
        ts: Date.now() + i,
      };
      const signedToken = jwt.sign(ticketPayload, secret, {
        expiresIn: "365d",
      });
      batch.set(ticketRef, {
        userId: organizerId,
        eventId: eventRef1.id,
        purchaseId: purchaseRef.id,
        ticketType: "standard",
        price: 150,
        userEmail: request.auth?.token?.email || "user_test@example.com",
        qrCode: signedToken,
        validated: false,
        status: "valid",
        purchaseDate: FieldValue.serverTimestamp(),
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
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    let accessToken: string;
    try {
      accessToken = mercadopagoAccessToken.value();
    } catch {
      if (isEmulator) {
        logger.info("MP_ACCESS_TOKEN not found, using dev mock id.");
        return { id: `pref_mock_${Date.now()}` };
      }
      throw new HttpsError(
        "failed-precondition",
        "MP_ACCESS_TOKEN não configurado."
      );
    }

    if (!accessToken && isEmulator) {
      return { id: `pref_mock_${Date.now()}` };
    }

    const client = new MercadoPagoConfig({
      accessToken,
    });

    const {
      eventId,
      quantity = 1,
      userId,
      userEmail,
      ticketType,
      paymentSessionId,
    } = request.data as {
      eventId: string;
      quantity?: number;
      userId: string;
      userEmail?: string;
      ticketType?: string;
      paymentSessionId?: string;
    };

    const authUid = request.auth?.uid;
    if (!authUid) {
      throw new HttpsError("permission-denied", "Autenticação obrigatória.");
    }
    if (userId && userId !== authUid) {
      throw new HttpsError("permission-denied", "Usuário inválido.");
    }
    if (!eventId || quantity < 1) {
      throw new HttpsError("invalid-argument", "Dados inválidos para compra.");
    }
    const resolvedUserId = authUid;

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
      pricing?: Record<string, number>;
    };

    if ((eventData.availableTickets || 0) < quantity) {
      throw new HttpsError(
        "failed-precondition",
        "Ingressos esgotados ou quantidade indisponível."
      );
    }

    let validType: string | null = null;
    if (ticketType && ["standard", "vip", "premium"].includes(ticketType)) {
      validType = ticketType;
    }
    let unitPrice = Number(eventData.price || 0);
    if (validType && eventData.pricing?.[validType] != null) {
      unitPrice = Number(eventData.pricing[validType]);
    }
    const typeLabels: Record<string, string> = {
      standard: "Padrão",
      vip: "VIP",
      premium: "Premium",
    };
    const typeLabel = validType ? ` - ${typeLabels[validType]}` : "";
    const title = `Ingresso${typeLabel}: ${eventData.title ?? ""}`;

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
          metadata: {
            eventId,
            userId: resolvedUserId,
            quantity,
            userEmail: payerEmail,
            ticketType: validType || "standard",
            paymentSessionId,
          },
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

      const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
      let accessToken: string;
      try {
        accessToken = mercadopagoAccessToken.value();
      } catch {
        if (isEmulator) {
          res.status(200).json({ id: `pref_mock_${Date.now()}` });
          return;
        }
        res.status(500).json({ message: "MP_ACCESS_TOKEN não configurado." });
        return;
      }

      if (!accessToken && isEmulator) {
        res.status(200).json({ id: `pref_mock_${Date.now()}` });
        return;
      }

      const {
        eventId,
        quantity = 1,
        userId,
        userEmail,
        ticketType,
        paymentSessionId,
      } = req.body as {
        eventId?: string;
        quantity?: number;
        userId?: string;
        userEmail?: string;
        ticketType?: string;
        paymentSessionId?: string;
      };

      if (
        !eventId ||
        !userId ||
        !userEmail ||
        !paymentSessionId ||
        quantity < 1
      ) {
        res.status(400).json({ message: "Dados inválidos para compra." });
        return;
      }

      const paymentSessionRef = admin
        .firestore()
        .collection("paymentSessions")
        .doc(paymentSessionId);
      const paymentSessionSnap = await paymentSessionRef.get();
      if (!paymentSessionSnap.exists) {
        res
          .status(404)
          .json({ message: "Sessão de pagamento não encontrada." });
        return;
      }
      const paymentSession = paymentSessionSnap.data() as {
        userId?: string;
        eventId?: string;
        status?: string;
      };
      if (
        paymentSession.userId !== userId ||
        paymentSession.eventId !== eventId
      ) {
        res.status(403).json({ message: "Sessão inválida para este usuário." });
        return;
      }
      if (paymentSession.status && paymentSession.status !== "pending") {
        res.status(409).json({ message: "Sessão já processada." });
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
        pricing?: Record<string, number>;
        inventory?: Record<string, number>;
      };
      let validType = "standard";
      if (ticketType && ["standard", "vip", "premium"].includes(ticketType)) {
        validType = ticketType;
      }
      const availableForType =
        eventData.inventory?.[validType] ?? eventData.availableTickets ?? 0;

      if (availableForType < quantity) {
        res
          .status(412)
          .json({ message: "Ingressos esgotados ou quantidade indisponível." });
        return;
      }

      const typeLabels: Record<string, string> = {
        standard: "Standard",
        vip: "VIP",
        premium: "Premium",
      };
      const unitPrice = Number(
        eventData.pricing?.[validType] ?? eventData.price ?? 0
      );
      const title = `Ingresso ${typeLabels[validType]}: ${
        eventData.title ?? ""
      }`;

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
            metadata: {
              eventId,
              userId,
              quantity,
              userEmail,
              ticketType: validType,
              paymentSessionId,
            },
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

export const createPixPayment = onCall(
  { secrets: [mercadopagoAccessToken] },
  async (request) => {
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    let accessToken: string;
    try {
      accessToken = mercadopagoAccessToken.value();
    } catch {
      if (isEmulator) {
        return {
          id: `pix_mock_${Date.now()}`,
          status: "pending",
          qrCode: "MOCK_QR_CODE",
          qrCodeBase64: "",
          ticketUrl: "",
        };
      }
      throw new HttpsError(
        "failed-precondition",
        "MP_ACCESS_TOKEN não configurado."
      );
    }

    if (!accessToken && isEmulator) {
      return {
        id: `pix_mock_${Date.now()}`,
        status: "pending",
        qrCode: "MOCK_QR_CODE",
        qrCodeBase64: "",
        ticketUrl: "",
      };
    }

    const client = new MercadoPagoConfig({
      accessToken,
    });

    const {
      eventId,
      quantity = 1,
      userId,
      userEmail,
      ticketType,
      paymentSessionId,
    } = request.data as {
      eventId: string;
      quantity?: number;
      userId: string;
      userEmail?: string;
      ticketType?: string;
      paymentSessionId?: string;
    };

    const authUid = request.auth?.uid;
    if (!authUid) {
      throw new HttpsError("permission-denied", "Autenticação obrigatória.");
    }
    if (userId && userId !== authUid) {
      throw new HttpsError("permission-denied", "Usuário inválido.");
    }
    if (!eventId || quantity < 1) {
      throw new HttpsError("invalid-argument", "Dados inválidos para compra.");
    }
    const resolvedUserId = authUid;

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
      pricing?: Record<string, number>;
    };

    if ((eventData.availableTickets || 0) < quantity) {
      throw new HttpsError(
        "failed-precondition",
        "Ingressos esgotados ou quantidade indisponível."
      );
    }

    let validType: string | null = null;
    if (ticketType && ["standard", "vip", "premium"].includes(ticketType)) {
      validType = ticketType;
    }
    let unitPrice = Number(eventData.price || 0);
    if (validType && eventData.pricing?.[validType] != null) {
      unitPrice = Number(eventData.pricing[validType]);
    }
    const totalAmount = unitPrice * quantity;
    const typeLabels: Record<string, string> = {
      standard: "Padrão",
      vip: "VIP",
      premium: "Premium",
    };
    const typeLabel = validType ? ` - ${typeLabels[validType]}` : "";
    const title = `Ingresso${typeLabel}: ${eventData.title ?? ""}`;

    const items = [
      {
        id: eventId,
        title,
        quantity,
        unit_price: unitPrice,
        currency_id: "BRL",
      },
    ];

    const payment = new Payment(client);
    try {
      const payerEmail = request.auth?.token.email || userEmail;
      const result = await payment.create({
        body: {
          transaction_amount: totalAmount,
          description: title,
          payment_method_id: "pix",
          payer: {
            email: payerEmail,
          },
          metadata: {
            eventId,
            userId: resolvedUserId,
            quantity,
            userEmail: payerEmail,
            ticketType: validType || "standard",
            paymentSessionId,
          },
          additional_info: {
            items,
            payer: {
              email: payerEmail,
            },
          },
          external_reference: paymentSessionId,
        },
      });

      const transactionData = (
        result as {
          point_of_interaction?: {
            transaction_data?: {
              qr_code?: string;
              qr_code_base64?: string;
              ticket_url?: string;
            };
          };
        }
      )?.point_of_interaction?.transaction_data;

      if (!transactionData?.qr_code) {
        throw new HttpsError(
          "internal",
          "Não foi possível obter o QR Code do Pix."
        );
      }

      return {
        id: result.id,
        status: result.status,
        qrCode: transactionData.qr_code,
        qrCodeBase64: transactionData.qr_code_base64 || "",
        ticketUrl: transactionData.ticket_url || "",
      };
    } catch (error) {
      logger.error("Erro ao criar pagamento Pix:", error);
      if (isEmulator) {
        const status = (error as { status?: number } | null)?.status;
        const code = (error as { code?: string } | null)?.code;
        if (
          status === 401 ||
          status === 403 ||
          code === "PA_UNAUTHORIZED_RESULT_FROM_POLICIES"
        ) {
          return {
            id: `pix_${Date.now()}`,
            status: "pending",
            qrCode: `pix_${Date.now()}`,
            qrCodeBase64: "",
            ticketUrl: "",
          };
        }
      }
      if (error instanceof HttpsError) {
        throw error;
      }
      throw new HttpsError(
        "internal",
        "Não foi possível criar o pagamento Pix."
      );
    }
  }
);

export const createPixPaymentPublic = onRequest(
  { secrets: [mercadopagoAccessToken] },
  async (req, res) => {
    corsHandler(req, res, async () => {
      if (req.method !== "POST") {
        res.status(405).send("Method Not Allowed");
        return;
      }

      const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
      let accessToken: string;
      try {
        accessToken = mercadopagoAccessToken.value();
      } catch {
        if (isEmulator) {
          res.status(200).json({
            id: `pix_mock_${Date.now()}`,
            status: "pending",
            qrCode: "MOCK_QR_CODE",
            qrCodeBase64: "",
            ticketUrl: "",
          });
          return;
        }
        res.status(500).json({ message: "MP_ACCESS_TOKEN não configurado." });
        return;
      }

      if (!accessToken && isEmulator) {
        res.status(200).json({
          id: `pix_mock_${Date.now()}`,
          status: "pending",
          qrCode: "MOCK_QR_CODE",
          qrCodeBase64: "",
          ticketUrl: "",
        });
        return;
      }

      const {
        eventId,
        quantity = 1,
        userId,
        userEmail,
        ticketType,
        paymentSessionId,
      } = req.body as {
        eventId?: string;
        quantity?: number;
        userId?: string;
        userEmail?: string;
        ticketType?: string;
        paymentSessionId?: string;
      };

      if (
        !eventId ||
        !userId ||
        !userEmail ||
        !paymentSessionId ||
        quantity < 1
      ) {
        res.status(400).json({ message: "Dados inválidos para compra." });
        return;
      }

      const paymentSessionRef = admin
        .firestore()
        .collection("paymentSessions")
        .doc(paymentSessionId);
      const paymentSessionSnap = await paymentSessionRef.get();
      if (!paymentSessionSnap.exists) {
        res
          .status(404)
          .json({ message: "Sessão de pagamento não encontrada." });
        return;
      }
      const paymentSession = paymentSessionSnap.data() as {
        userId?: string;
        eventId?: string;
        status?: string;
      };
      if (
        paymentSession.userId !== userId ||
        paymentSession.eventId !== eventId
      ) {
        res.status(403).json({ message: "Sessão inválida para este usuário." });
        return;
      }
      if (paymentSession.status && paymentSession.status !== "pending") {
        res.status(409).json({ message: "Sessão já processada." });
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
        pricing?: Record<string, number>;
        inventory?: Record<string, number>;
      };
      let validType = "standard";
      if (ticketType && ["standard", "vip", "premium"].includes(ticketType)) {
        validType = ticketType;
      }
      const availableForType =
        eventData.inventory?.[validType] ?? eventData.availableTickets ?? 0;

      if (availableForType < quantity) {
        res
          .status(412)
          .json({ message: "Ingressos esgotados ou quantidade indisponível." });
        return;
      }

      const typeLabels: Record<string, string> = {
        standard: "Standard",
        vip: "VIP",
        premium: "Premium",
      };
      const unitPrice = Number(
        eventData.pricing?.[validType] ?? eventData.price ?? 0
      );
      const totalAmount = unitPrice * quantity;
      const title = `Ingresso ${typeLabels[validType]}: ${
        eventData.title ?? ""
      }`;

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

      const payment = new Payment(client);
      try {
        const result = await payment.create({
          body: {
            transaction_amount: totalAmount,
            description: title,
            payment_method_id: "pix",
            payer: {
              email: userEmail,
            },
            metadata: {
              eventId,
              userId,
              quantity,
              userEmail,
              ticketType: validType,
              paymentSessionId,
            },
            additional_info: {
              items,
              payer: {
                email: userEmail,
              },
            },
            external_reference: paymentSessionId,
          },
        });

        const transactionData = (
          result as {
            point_of_interaction?: {
              transaction_data?: {
                qr_code?: string;
                qr_code_base64?: string;
                ticket_url?: string;
              };
            };
          }
        )?.point_of_interaction?.transaction_data;

        if (!transactionData?.qr_code) {
          res.status(502).json({ message: "QR Code Pix não retornado." });
          return;
        }

        res.status(200).json({
          id: result.id,
          status: result.status,
          qrCode: transactionData.qr_code,
          qrCodeBase64: transactionData.qr_code_base64 || "",
          ticketUrl: transactionData.ticket_url || "",
        });
      } catch (error) {
        logger.error("Erro ao criar pagamento Pix público:", error);
        res.status(500).json({ message: "Erro ao criar pagamento Pix." });
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
            ticketType: metadataTicketType,
            paymentSessionId: metadataPaymentSessionId,
          } = payment.metadata as {
            eventId: string;
            userId?: string;
            userEmail?: string;
            ticketType?: string;
            paymentSessionId?: string;
          };
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
          let oversold = false;
          let failedPurchaseId = "";
          await getFirestore().runTransaction(async (transaction) => {
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

            const data = eventDoc.data() as {
              availableTickets?: number;
              inventory?: Record<string, number>;
              date?: string;
              time?: string;
              price?: number;
              pricing?: Record<string, number>;
            };
            const currentStock = data.availableTickets || 0;
            const currentTypeStock =
              data.inventory?.[resolvedTicketType] ?? currentStock;
            const unitPrice = Number(
              data.pricing?.[resolvedTicketType] ?? data.price ?? 0
            );

            if (
              currentStock < ticketsCount ||
              currentTypeStock < ticketsCount
            ) {
              logger.error("Overselling detected", {
                eventId,
                currentStock,
                currentTypeStock,
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
                price: unitPrice,
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
            await admin
              .firestore()
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

        const jwtRawSecret = jwtSecret.value();
        if (!jwtRawSecret) {
          res
            .status(500)
            .json({ success: false, message: "Erro de configuração interna." });
          return;
        }
        const secret = jwtRawSecret;
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

        const ticketRef = getFirestore().collection("tickets").doc(ticketId);
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
          validatedAt?: Timestamp;
          ticketType?: string;
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
          status: "used",
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

        const ticketTypeLabels: Record<string, string> = {
          standard: "Padrão",
          vip: "VIP",
          premium: "Premium",
        };
        const ticketTypeLabel =
          ticketTypeLabels[ticket?.ticketType ?? ""] ??
          ticket?.ticketType ??
          "Geral";

        res.status(200).json({
          success: true,
          ticket: {
            eventTitle: event?.title || "Evento Desconhecido",
            ticketType: ticketTypeLabel,
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
  const isAdmin = request.auth?.token.admin === true;
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  if (!isAdmin) {
    if (!isEmulator || !request.auth?.uid) {
      throw new HttpsError(
        "permission-denied",
        "Apenas administradores podem realizar esta operação."
      );
    }
  }
  const { uid, role } = request.data as {
    uid?: string;
    role?: "organizer" | "validator" | "admin";
  };
  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "UID e role são obrigatórios.");
  }
  if (!isAdmin && request.auth?.uid !== uid) {
    throw new HttpsError(
      "permission-denied",
      "No emulador, apenas o próprio usuário pode alterar o role."
    );
  }
  if (!isAdmin && role === "admin") {
    throw new HttpsError(
      "permission-denied",
      "No emulador, não é permitido promover usuário para admin."
    );
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
      purchaseDate?: Timestamp;
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
      getFirestore().collection("events").doc(eventId).get(),
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
        const baseURL = webBaseUrl.value();
        const link = await admin
          .auth()
          .generatePasswordResetLink(userRecord.email, {
            url: `${baseURL}/login`,
          });
        accountLine =
          "<p>Sua conta foi criada automaticamente.</p>" +
          `<p>Defina sua senha aqui: <a href="${link}">Criar senha</a></p>`;
      } catch (error) {
        logger.warn("Falha ao gerar link de senha", error);
      }
    }

    const subject = `Ingressos confirmados – ${eventTitle}`;
    const ticketWord = ticketsCount === 1 ? "ingresso" : "ingressos";
    const bannerImg = (event as { image?: string })?.image;
    /* eslint-disable max-len, quotes, operator-linebreak */
    const bannerHtml = bannerImg
      ? `<img src="${bannerImg}" alt="${eventTitle}" ` +
        'style="width:100%;max-height:220px;object-fit:cover;display:block;" />'
      : "";
    const infoRows = infoLines
      .map(
        (line) =>
          "<tr><td " +
          'style="padding:7px 0;color:#475569;font-size:13px;border-bottom:1px solid #e2e8f0;">' +
          `${line}</td></tr>`
      )
      .join("");
    const baseURL = webBaseUrl.value();
    const html = [
      "<!DOCTYPE html>",
      '<html lang="pt-BR">',
      "<head>",
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>Ingressos Confirmados</title>",
      "</head>",
      '<body style="margin:0;padding:0;background:#EFF6FF;',
      "font-family:'Helvetica Neue',Arial,sans-serif;\">",

      // Outer wrapper
      '<table width="100%" cellpadding="0" cellspacing="0" ',
      'style="background:#EFF6FF;padding:40px 16px;">',
      '<tr><td align="center">',

      // Card
      '<table width="560" cellpadding="0" cellspacing="0" ',
      'style="background:#ffffff;border-radius:20px;overflow:hidden;',
      "box-shadow:0 8px 32px rgba(37,99,235,0.10);max-width:560px;width:100%;\">",

      // Header gradient — Premium Blue
      "<tr>",
      '<td style="background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%);',
      'padding:32px 36px 28px;">',
      '<p style="margin:0 0 8px;color:rgba(255,255,255,0.70);font-size:10px;',
      'font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">',
      "INGRESSOSZ · CONFIRMAÇÃO DE COMPRA</p>",
      '<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;',
      `line-height:1.25;letter-spacing:-0.01em;">${eventTitle}</h1>`,
      "</td>",
      "</tr>",

      // Banner (optional)
      bannerImg ? `<tr><td style="padding:0;">${bannerHtml}</td></tr>` : "",

      // Body
      "<tr>",
      '<td style="padding:32px 36px;">',

      // Greeting
      '<p style="margin:0 0 24px;font-size:16px;color:#0f172a;line-height:1.6;">',
      `Olá! ${ticketsCount === 1 ? "Seu" : "Seus"} <strong style="color:#1d4ed8;">${ticketsCount} ${ticketWord}</strong> `,
      "para o evento foram confirmados com sucesso.</p>",

      // Event info table
      infoRows
        ? '<table cellpadding="0" cellspacing="0" ' +
          'style="width:100%;margin-bottom:28px;background:#F8FAFF;' +
          'border-radius:12px;border:1px solid #DBEAFE;padding:4px 16px;">' +
          infoRows +
          "</table>"
        : "",

      // Account created notice
      accountLine
        ? '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;' +
          'padding:16px 18px;margin-bottom:24px;font-size:13px;color:#1e40af;">' +
          accountLine +
          "</div>"
        : "",

      // CTA Button
      '<table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">',
      '<tr><td style="border-radius:10px;',
      'background:linear-gradient(135deg,#1d4ed8,#3b82f6);',
      'box-shadow:0 4px 14px rgba(37,99,235,0.35);">',
      `<a href="${baseURL}/meus-ingressos" `,
      'style="display:inline-block;color:#ffffff;font-weight:700;font-size:14px;',
      'padding:14px 32px;border-radius:10px;text-decoration:none;',
      'letter-spacing:0.03em;">Ver Meus Ingressos</a>',
      "</td></tr></table>",

      "</td>",
      "</tr>",

      // Footer
      "<tr>",
      '<td style="background:#F1F5F9;padding:18px 36px;border-top:1px solid #E2E8F0;">',
      '<p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.7;">',
      `Dúvidas? Acesse <a href="${baseURL}" `,
      'style="color:#2563eb;text-decoration:none;font-weight:600;">ingressosz.web.app</a>',
      "<br>Este é um e-mail automático, não responda.",
      "</p>",
      "</td>",
      "</tr>",

      "</table>",
      "</td></tr>",
      "</table>",
      "</body>",
      "</html>",
    ].join("");
    /* eslint-enable max-len, quotes, operator-linebreak */

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
  const purchaseRef = getFirestore().collection("purchases").doc(purchaseId);
  let shouldSend = false;
  let userId = fallback?.userId;
  let eventId = fallback?.eventId;
  let ticketsCount = fallback?.ticketsCount;
  let accountCreated = fallback?.accountCreated;

  try {
    await getFirestore().runTransaction(async (transaction) => {
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

      const purchasesRef = getFirestore().collection("purchases");
      const snapshot = await purchasesRef
        .where("paymentId", "==", paymentId)
        .get();

      if (!snapshot.empty) {
        const purchaseDoc = snapshot.docs[0];
        await purchaseDoc.ref.update({ status: "refunded" });

        const ticketsRef = getFirestore().collection("tickets");
        const ticketsSnapshot = await ticketsRef
          .where("purchaseId", "==", purchaseDoc.id)
          .get();

        const batch = getFirestore().batch();
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

// =============================================================================
// Scheduled: Expirar sessões Pix pendentes
// =============================================================================
const PIX_EXPIRATION_MINUTES = 30;

export const expireStalePixSessions = onSchedule(
  { schedule: "every 15 minutes", region: "southamerica-east1" },
  async () => {
    const db = getFirestore();
    const cutoff = new Date(Date.now() - PIX_EXPIRATION_MINUTES * 60 * 1000);

    const snapshot = await db
      .collection("paymentSessions")
      .where("status", "==", "pending")
      .where("createdAt", "<", cutoff)
      .get();

    if (snapshot.empty) {
      logger.info("Nenhuma sessão Pix expirada encontrada.");
      return;
    }

    const batchSize = 500;
    let processed = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);

      for (const docSnap of chunk) {
        batch.update(docSnap.ref, {
          status: "expired",
          expiredAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      processed += chunk.length;
    }

    logger.info(
      `${processed} sessões de pagamento expiradas marcadas como expired.`
    );
  }
);
