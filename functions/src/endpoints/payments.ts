import { createHmac } from "crypto";
import admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import jwt from "jsonwebtoken";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import { corsHandler } from "../config/cors.js";
import {
  jwtSecret,
  mercadopagoAccessToken,
  mpWebhookSecret,
  smtpEmail,
  smtpPassword,
  webBaseUrl,
} from "../config/params.js";
import { planSaleInventoryUpdate } from "../domain/inventory.js";
import {
  MAX_PURCHASE_QUANTITY,
  resolveMaxPerPurchase,
} from "../domain/purchaseLimits.js";
import { sendPurchaseEmail } from "./email.js";
import { checkRateLimit } from "../utils/rateLimit.js";
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
    const allowedPref = await checkRateLimit(`pref:${authUid}`, 10);
    if (!allowedPref) {
      throw new HttpsError(
        "resource-exhausted",
        "Muitas tentativas. Aguarde um momento e tente novamente."
      );
    }
    if (!eventId || !Number.isInteger(quantity) || quantity < 1) {
      throw new HttpsError("invalid-argument", "Dados inválidos para compra.");
    }
    const resolvedUserId = authUid;

    if (paymentSessionId) {
      const sessionRef = getFirestore()
        .collection("paymentSessions")
        .doc(paymentSessionId);
      await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(sessionRef);
        if (snap.exists) {
          const status = (snap.data() as { status?: string })?.status;
          if (status && status !== "pending") {
            throw new HttpsError("already-exists", "Sessão já processada.");
          }
        }
      });
    }

    const eventDoc = await getFirestore()
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
      maxPerPurchase?: number;
    };

    const maxAllowed = resolveMaxPerPurchase(eventData);
    if (quantity > maxAllowed) {
      throw new HttpsError(
        "invalid-argument",
        `Máximo de ${maxAllowed} ingressos por compra.`
      );
    }

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

      const clientIp = String(
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
      ).split(",")[0].trim();
      const allowedPublicPref = await checkRateLimit(`pubpref:${clientIp}`, 10);
      if (!allowedPublicPref) {
        res.status(429).json({
          message: "Muitas tentativas. Tente novamente em instantes.",
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
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_PURCHASE_QUANTITY
      ) {
        res.status(400).json({ message: "Dados inválidos para compra." });
        return;
      }

      const paymentSessionRef = getFirestore()
        .collection("paymentSessions")
        .doc(paymentSessionId);
      type SessionGuardResult =
        | { ok: true }
        | { ok: false; status: number; message: string };
      const sessionResult = await getFirestore()
        .runTransaction<SessionGuardResult>(async (tx) => {
          const snap = await tx.get(paymentSessionRef);
          if (!snap.exists) {
            return {
              ok: false,
              status: 404,
              message: "Sessão de pagamento não encontrada.",
            };
          }
          const data = snap.data() as {
            userId?: string;
            eventId?: string;
            status?: string;
          };
          if (data.userId !== userId || data.eventId !== eventId) {
            return {
              ok: false,
              status: 403,
              message: "Sessão inválida para este usuário.",
            };
          }
          if (data.status && data.status !== "pending") {
            return {
              ok: false,
              status: 409,
              message: "Sessão já processada.",
            };
          }
          return { ok: true };
        });
      if (!sessionResult.ok) {
        res
          .status(sessionResult.status)
          .json({ message: sessionResult.message });
        return;
      }

      const eventDoc = await getFirestore()
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
        maxPerPurchase?: number;
      };

      const maxAllowed = resolveMaxPerPurchase(eventData);
      if (quantity > maxAllowed) {
        res.status(400).json({
          message: `Máximo de ${maxAllowed} ingressos por compra.`,
        });
        return;
      }

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
    const allowedPix = await checkRateLimit(`pix:${authUid}`, 10);
    if (!allowedPix) {
      throw new HttpsError(
        "resource-exhausted",
        "Muitas tentativas. Aguarde um momento e tente novamente."
      );
    }
    if (!eventId || !Number.isInteger(quantity) || quantity < 1) {
      throw new HttpsError("invalid-argument", "Dados inválidos para compra.");
    }
    const resolvedUserId = authUid;

    if (paymentSessionId) {
      const sessionRef = getFirestore()
        .collection("paymentSessions")
        .doc(paymentSessionId);
      await getFirestore().runTransaction(async (tx) => {
        const snap = await tx.get(sessionRef);
        if (snap.exists) {
          const status = (snap.data() as { status?: string })?.status;
          if (status && status !== "pending") {
            throw new HttpsError("already-exists", "Sessão já processada.");
          }
        }
      });
    }

    const eventDoc = await getFirestore()
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
      maxPerPurchase?: number;
    };

    const maxAllowed = resolveMaxPerPurchase(eventData);
    if (quantity > maxAllowed) {
      throw new HttpsError(
        "invalid-argument",
        `Máximo de ${maxAllowed} ingressos por compra.`
      );
    }

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

      const clientIpPix = String(
        req.headers["x-forwarded-for"] || req.socket.remoteAddress || "unknown"
      ).split(",")[0].trim();
      const allowedPublicPix = await checkRateLimit(
        `pubpix:${clientIpPix}`,
        10
      );
      if (!allowedPublicPix) {
        res.status(429).json({
          message: "Muitas tentativas. Tente novamente em instantes.",
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
        !Number.isInteger(quantity) ||
        quantity < 1 ||
        quantity > MAX_PURCHASE_QUANTITY
      ) {
        res.status(400).json({ message: "Dados inválidos para compra." });
        return;
      }

      const paymentSessionRef = getFirestore()
        .collection("paymentSessions")
        .doc(paymentSessionId);
      type SessionGuardResult =
        | { ok: true }
        | { ok: false; status: number; message: string };
      const sessionResult = await getFirestore()
        .runTransaction<SessionGuardResult>(async (tx) => {
          const snap = await tx.get(paymentSessionRef);
          if (!snap.exists) {
            return {
              ok: false,
              status: 404,
              message: "Sessão de pagamento não encontrada.",
            };
          }
          const data = snap.data() as {
            userId?: string;
            eventId?: string;
            status?: string;
          };
          if (data.userId !== userId || data.eventId !== eventId) {
            return {
              ok: false,
              status: 403,
              message: "Sessão inválida para este usuário.",
            };
          }
          if (data.status && data.status !== "pending") {
            return {
              ok: false,
              status: 409,
              message: "Sessão já processada.",
            };
          }
          return { ok: true };
        });
      if (!sessionResult.ok) {
        res
          .status(sessionResult.status)
          .json({ message: sessionResult.message });
        return;
      }

      const eventDoc = await getFirestore()
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
        maxPerPurchase?: number;
      };

      const maxAllowed = resolveMaxPerPurchase(eventData);
      if (quantity > maxAllowed) {
        res.status(400).json({
          message: `Máximo de ${maxAllowed} ingressos por compra.`,
        });
        return;
      }

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
