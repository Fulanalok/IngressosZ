/* eslint-disable require-jsdoc, max-len */
import { createHmac, timingSafeEqual } from "node:crypto";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onRequest } from "firebase-functions/v2/https";
import jwt from "jsonwebtoken";
import { MercadoPagoConfig, Payment } from "mercadopago";
import {
  PaymentFulfillmentDependencies,
  ProviderPayment,
  normalizePaymentId,
  processProviderPayment,
  stableWebhookDocumentId,
  ticketExpirySeconds,
} from "../domain/paymentFulfillment.js";
import { createFirestorePaymentFulfillmentRepository } from
  "../infrastructure/paymentFulfillmentFirestore.js";
import {
  jwtSecret,
  mercadopagoAccessToken,
  mpWebhookSecret,
  smtpPassword,
} from "../config/params.js";
import { sendPurchaseEmail } from "./email.js";

type WebhookRequest = {
  headers: Record<string, string | string[] | undefined>;
  body?: {
    type?: unknown;
    action?: unknown;
    data?: { id?: unknown };
  };
};

type WebhookResponse = {
  status(code: number): WebhookResponse;
  send(payload: string): unknown;
};

export interface WebhookHandlerDependencies {
  webhookSecret(): string;
  getPayment(paymentId: string): Promise<ProviderPayment>;
  processPayment(
    paymentId: string,
    payment: ProviderPayment
  ): Promise<{ outcome: string }>;
}

function headerValue(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

// Signature parsing validates each required component before constant-time compare.
// eslint-disable-next-line complexity
export function verifyMercadoPagoSignature(input: {
  signature: unknown;
  requestId: unknown;
  dataId: unknown;
  secret: string;
}) {
  if (
    typeof input.signature !== "string" ||
    typeof input.requestId !== "string" ||
    !input.requestId.trim() ||
    !input.secret
  ) {
    return false;
  }
  const dataId = normalizePaymentId(input.dataId);
  if (!dataId) return false;

  let timestamp: string | undefined;
  let receivedHash: string | undefined;
  for (const part of input.signature.split(",")) {
    const separator = part.indexOf("=");
    if (separator < 1) continue;
    const key = part.slice(0, separator).trim();
    const value = part.slice(separator + 1).trim();
    if (key === "ts" && value) timestamp = value;
    if (key === "v1" && value) receivedHash = value;
  }
  if (!timestamp || !receivedHash || !/^[a-fA-F0-9]+$/.test(receivedHash)) {
    return false;
  }
  const manifest =
    `id:${dataId};request-id:${input.requestId};ts:${timestamp};`;
  const expectedHash = createHmac("sha256", input.secret)
    .update(manifest)
    .digest();
  const receivedBuffer = Buffer.from(receivedHash, "hex");
  return receivedBuffer.length === expectedHash.length &&
    timingSafeEqual(receivedBuffer, expectedHash);
}

export function createWebhookHandler(dependencies: WebhookHandlerDependencies) {
  return async (request: WebhookRequest, response: WebhookResponse) => {
    const paymentId = normalizePaymentId(request.body?.data?.id);
    const signatureValid = verifyMercadoPagoSignature({
      signature: headerValue(request.headers["x-signature"]),
      requestId: headerValue(request.headers["x-request-id"]),
      dataId: request.body?.data?.id,
      secret: dependencies.webhookSecret(),
    });
    if (!signatureValid || !paymentId) {
      logger.warn("Webhook do Mercado Pago com assinatura invalida.");
      response.status(403).send("Forbidden");
      return;
    }
    if (request.body?.type !== "payment") {
      response.status(200).send("OK");
      return;
    }

    try {
      const payment = await dependencies.getPayment(paymentId);
      const result = await dependencies.processPayment(paymentId, payment);
      logger.info("Webhook do Mercado Pago concluido.", {
        paymentId,
        outcome: result.outcome,
      });
      response.status(200).send("OK");
    } catch (error) {
      logger.error("Falha transitoria no webhook do Mercado Pago.", {
        paymentId,
        error: error instanceof Error ? error.message : String(error),
      });
      response.status(500).send("Internal Server Error");
    }
  };
}

function productionFulfillmentDependencies(): PaymentFulfillmentDependencies {
  const secret = jwtSecret.value();
  if (!secret) throw new Error("JWT_SECRET nao configurado.");
  return {
    repository: createFirestorePaymentFulfillmentRepository(getFirestore()),
    now: () => Date.now(),
    createPurchaseId: (paymentId) =>
      stableWebhookDocumentId("purchase", paymentId),
    createTicketId: (paymentId, index) =>
      stableWebhookDocumentId("ticket", `${paymentId}:${index}`),
    signTicket: (input) => jwt.sign({
      tid: input.ticketId,
      eid: input.eventId,
      uid: input.userId,
      ts: input.issuedAtMillis,
      iat: Math.floor(input.issuedAtMillis / 1000),
    }, secret, {
      expiresIn: ticketExpirySeconds(
        input.issuedAtMillis,
        input.eventDate,
        input.eventTime
      ),
    }),
    sendPurchaseEmail: async (purchaseId, details) => {
      await sendPurchaseEmail(purchaseId, details);
    },
    logger,
  };
}

const productionHandler = createWebhookHandler({
  webhookSecret: () => mpWebhookSecret.value(),
  getPayment: async (paymentId) => {
    const client = new MercadoPagoConfig({
      accessToken: mercadopagoAccessToken.value(),
    });
    return await new Payment(client).get({ id: paymentId }) as ProviderPayment;
  },
  processPayment: async (paymentId, payment) => processProviderPayment(
    paymentId,
    payment,
    productionFulfillmentDependencies()
  ),
});

export const receiveWebhook = onRequest(
  {
    secrets: [
      mercadopagoAccessToken,
      smtpPassword,
      mpWebhookSecret,
      jwtSecret,
    ],
  },
  productionHandler
);
