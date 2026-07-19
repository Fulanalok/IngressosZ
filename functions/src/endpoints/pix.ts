/* eslint-disable require-jsdoc, complexity */
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { MercadoPagoConfig, Payment } from "mercadopago";
import { mercadopagoAccessToken } from "../config/params.js";
import { callableSecurityOptions } from "../config/security.js";
import { TICKET_TYPE_LABELS } from "../domain/ticketTypes.js";
import { checkRateLimit } from "../utils/rateLimit.js";
import {
  PaymentEventData,
  PaymentSessionData,
  buildProviderIdempotencyKey,
  executeProviderPayment,
  paymentSessionRepository,
} from "./paymentSessions.js";

function mockPixResult() {
  const id = `pix_mock_${Date.now()}`;
  return {
    providerId: id,
    response: {
      id,
      status: "pending",
      qrCode: "MOCK_QR_CODE",
      qrCodeBase64: "",
      ticketUrl: "",
    },
  };
}

export async function createPixWithClient(
  payment: Pick<Payment, "create">,
  session: PaymentSessionData,
  event: PaymentEventData,
  paymentSessionId: string
) {
  const title = `Ingresso ${TICKET_TYPE_LABELS[session.ticketType]}: ${
    event.title ?? ""
  }`;
  const result = await payment.create({
    body: {
      transaction_amount: session.totalAmount,
      description: title,
      payment_method_id: "pix",
      payer: { email: session.userEmail },
      metadata: {
        eventId: session.eventId,
        userId: session.userId,
        quantity: session.quantity,
        userEmail: session.userEmail,
        ticketType: session.ticketType,
        paymentSessionId,
      },
      additional_info: {
        items: [{
          id: session.eventId,
          title,
          quantity: session.quantity,
          unit_price: session.unitPrice,
          currency_id: "BRL",
        }],
        payer: { email: session.userEmail },
      },
      external_reference: paymentSessionId,
    },
    requestOptions: {
      idempotencyKey: buildProviderIdempotencyKey(paymentSessionId, "pix"),
    },
  });
  const transactionData = result.point_of_interaction?.transaction_data;
  if (!result.id || !transactionData?.qr_code) {
    throw new HttpsError("internal", "QR Code Pix nao retornado.");
  }
  return {
    providerId: String(result.id),
    response: {
      id: String(result.id),
      status: result.status,
      qrCode: transactionData.qr_code,
      qrCodeBase64: transactionData.qr_code_base64 || "",
      ticketUrl: transactionData.ticket_url || "",
    },
  };
}

async function createPixAtProvider(
  session: PaymentSessionData,
  event: PaymentEventData,
  paymentSessionId: string
) {
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  let accessToken = "";
  try {
    accessToken = mercadopagoAccessToken.value();
  } catch {
    if (!isEmulator) {
      throw new HttpsError(
        "failed-precondition",
        "MP_ACCESS_TOKEN nao configurado."
      );
    }
  }
  if (!accessToken) {
    if (isEmulator) return mockPixResult();
    throw new HttpsError(
      "failed-precondition",
      "MP_ACCESS_TOKEN nao configurado."
    );
  }

  const payment = new Payment(new MercadoPagoConfig({ accessToken }));
  try {
    return await createPixWithClient(
      payment,
      session,
      event,
      paymentSessionId
    );
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
        return mockPixResult();
      }
    }
    if (error instanceof HttpsError) throw error;
    throw new HttpsError("internal", "Nao foi possivel criar o pagamento Pix.");
  }
}

export const createPixPayment = onCall(
  { ...callableSecurityOptions, secrets: [mercadopagoAccessToken] },
  (request) => executeProviderPayment(
    request,
    "pix",
    "paymentId",
    {
      repository: paymentSessionRepository,
      now: () => Date.now(),
      checkRateLimit: (uid) => checkRateLimit(`pix:${uid}`, 10),
      createProviderPayment: createPixAtProvider,
    }
  )
);
