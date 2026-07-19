/* eslint-disable require-jsdoc, complexity */
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { MercadoPagoConfig, Preference } from "mercadopago";
import { mercadopagoAccessToken, webBaseUrl } from "../config/params.js";
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

async function createPreferenceAtProvider(
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
    if (isEmulator) {
      const id = `pref_mock_${Date.now()}`;
      return { providerId: id, response: { id } };
    }
    throw new HttpsError(
      "failed-precondition",
      "MP_ACCESS_TOKEN nao configurado."
    );
  }

  const title = `Ingresso ${TICKET_TYPE_LABELS[session.ticketType]}: ${
    event.title ?? ""
  }`;
  const preference = new Preference(new MercadoPagoConfig({ accessToken }));
  try {
    const result = await preference.create({
      body: {
        items: [{
          id: session.eventId,
          title,
          quantity: session.quantity,
          unit_price: session.unitPrice,
          currency_id: "BRL",
        }],
        payer: { email: session.userEmail },
        metadata: {
          eventId: session.eventId,
          userId: session.userId,
          quantity: session.quantity,
          userEmail: session.userEmail,
          ticketType: session.ticketType,
          paymentSessionId,
        },
        back_urls: {
          success: `${webBaseUrl.value()}/pagamento/sucesso`,
          failure: `${webBaseUrl.value()}/pagamento/cancelado`,
          pending: `${webBaseUrl.value()}/pagamento/cancelado`,
        },
        auto_return: "approved",
      },
      requestOptions: {
        idempotencyKey: buildProviderIdempotencyKey(
          paymentSessionId,
          "checkout"
        ),
      },
    });
    if (!result.id) {
      throw new HttpsError("internal", "Preference ID nao retornado.");
    }
    return { providerId: result.id, response: { id: result.id } };
  } catch (error) {
    logger.error("Erro ao criar preferencia de pagamento:", error);
    if (isEmulator) {
      const status = (error as { status?: number } | null)?.status;
      const code = (error as { code?: string } | null)?.code;
      if (
        status === 401 ||
        status === 403 ||
        code === "PA_UNAUTHORIZED_RESULT_FROM_POLICIES"
      ) {
        const id = `pref_mock_${Date.now()}`;
        return { providerId: id, response: { id } };
      }
    }
    if (error instanceof HttpsError) throw error;
    throw new HttpsError(
      "internal",
      "Nao foi possivel criar a preferencia de pagamento."
    );
  }
}

export const createPaymentPreference = onCall(
  { ...callableSecurityOptions, secrets: [mercadopagoAccessToken] },
  (request) => executeProviderPayment(
    request,
    "checkout",
    "preferenceId",
    {
      repository: paymentSessionRepository,
      now: () => Date.now(),
      checkRateLimit: (uid) => checkRateLimit(`pref:${uid}`, 10),
      createProviderPayment: createPreferenceAtProvider,
    }
  )
);
