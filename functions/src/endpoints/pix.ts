import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { corsHandler } from "../config/cors.js";
import { mercadopagoAccessToken } from "../config/params.js";
import { callableSecurityOptions } from "../config/security.js";
import {
  MAX_PURCHASE_QUANTITY,
  resolveMaxPerPurchase,
} from "../domain/purchaseLimits.js";
import { requireAppCheck } from "../utils/appCheck.js";
import { checkRateLimit } from "../utils/rateLimit.js";
export const createPixPayment = onCall(
  { ...callableSecurityOptions, secrets: [mercadopagoAccessToken] },
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
      if (!(await requireAppCheck(req, res))) return;

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
