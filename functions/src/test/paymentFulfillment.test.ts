import { expect } from "chai";
import { createHmac } from "node:crypto";
import { describe, it } from "mocha";
import type {
  PaymentFulfillmentDependencies,
  PersistedPaymentSession,
  ProviderPayment,
} from "../../lib/domain/paymentFulfillment.js";
import {
  classifyPaymentCompatibility,
  extractPaymentSessionId,
  isApprovedProviderPayment,
  moneyToCents,
  processProviderPayment,
} from "../../lib/domain/paymentFulfillment.js";
import { createWebhookHandler, verifyMercadoPagoSignature } from
  "../../lib/endpoints/webhook.js";

const session = (
  overrides: Partial<PersistedPaymentSession> = {}
): PersistedPaymentSession => ({
  eventId: "event-1",
  userId: "user-1",
  userEmail: "buyer@example.com",
  ticketType: "vip",
  quantity: 2,
  unitPrice: 12.34,
  totalAmount: 24.68,
  paymentMethod: "checkout",
  provider: "mercadopago",
  providerState: "created",
  status: "pending",
  ...overrides,
});

const payment = (overrides: Partial<ProviderPayment> = {}): ProviderPayment => ({
  id: "payment-1",
  status: "approved",
  transaction_amount: 24.68,
  currency_id: "BRL",
  external_reference: "session-1",
  metadata: { paymentSessionId: "session-1" },
  ...overrides,
});

describe("payment fulfillment helpers", () => {
  it("extrai external_reference", () => {
    expect(extractPaymentSessionId(payment())).to.deep.equal({
      paymentSessionId: "session-1",
    });
  });

  it("aceita metadata paymentSessionId atual e legado", () => {
    expect(extractPaymentSessionId({
      metadata: { paymentSessionId: "current-session" },
    })).to.deep.equal({ paymentSessionId: "current-session" });
    expect(extractPaymentSessionId({
      metadata: { payment_session_id: "legacy-session" },
    })).to.deep.equal({ paymentSessionId: "legacy-session" });
  });

  it("rejeita referencias divergentes", () => {
    expect(extractPaymentSessionId(payment({
      metadata: { paymentSessionId: "other-session" },
    }))).to.deep.equal({ reason: "divergent_reference" });
  });

  it("converte dinheiro para centavos sem comparar floats diretamente", () => {
    expect(moneyToCents(12.34)).to.equal(1234);
    expect(moneyToCents(0.1 + 0.2)).to.equal(30);
    expect(moneyToCents(12.345)).to.equal(undefined);
    expect(moneyToCents(Number.NaN)).to.equal(undefined);
  });

  it("ignora pagamento que ainda nao foi aprovado", () => {
    expect(isApprovedProviderPayment(payment())).to.equal(true);
    expect(isApprovedProviderPayment(payment({ status: "pending" })))
      .to.equal(false);
  });

  it("aceita valor correto e estados de tentativa recuperaveis", () => {
    for (const providerState of ["created", "creating", "failed"]) {
      expect(classifyPaymentCompatibility({
        paymentId: "payment-1",
        payment: payment(),
        session: session({ providerState }),
        eventExists: true,
      })).to.deep.equal({ kind: "valid" });
    }
  });

  it("rejeita valor, moeda e providerState ready incompatíveis", () => {
    expect(classifyPaymentCompatibility({
      paymentId: "payment-1",
      payment: payment({ transaction_amount: 24.67 }),
      session: session(),
      eventExists: true,
    })).to.include({
      kind: "permanent",
      outcome: "refund_required_amount_mismatch",
    });
    expect(classifyPaymentCompatibility({
      paymentId: "payment-1",
      payment: payment({ currency_id: "USD" }),
      session: session(),
      eventExists: true,
    })).to.include({ kind: "permanent", reason: "currency_mismatch" });
    expect(classifyPaymentCompatibility({
      paymentId: "payment-1",
      payment: payment(),
      session: session({ providerState: "ready" }),
      eventExists: true,
    })).to.include({ kind: "permanent", reason: "invalid_provider_state" });
  });

  it("ignora metadados adulterados na classificacao", () => {
    const result = classifyPaymentCompatibility({
      paymentId: "payment-1",
      payment: payment({
        metadata: {
          paymentSessionId: "session-1",
          eventId: "attacker-event",
          userId: "attacker",
          quantity: 999,
          ticketType: "premium",
        },
      }),
      session: session(),
      eventExists: true,
    });
    expect(result).to.deep.equal({ kind: "valid" });
  });

  it("classifica sessao aprovada pelo mesmo ou por outro pagamento", () => {
    expect(classifyPaymentCompatibility({
      paymentId: "payment-1",
      payment: payment(),
      session: session({
        status: "approved",
        paymentId: "payment-1",
        purchaseId: "purchase-1",
      }),
      eventExists: true,
    })).to.deep.equal({ kind: "idempotent", purchaseId: "purchase-1" });
    expect(classifyPaymentCompatibility({
      paymentId: "payment-1",
      payment: payment(),
      session: session({ status: "approved", paymentId: "payment-2" }),
      eventExists: true,
    })).to.include({
      kind: "permanent",
      outcome: "refund_required_duplicate",
    });
  });

  it("valida assinatura HMAC e rejeita hash ausente ou diferente", () => {
    const secret = "webhook-secret";
    const requestId = "request-1";
    const dataId = "payment-1";
    const timestamp = "1700000000";
    const hash = createHmac("sha256", secret)
      .update(`id:${dataId};request-id:${requestId};ts:${timestamp};`)
      .digest("hex");
    expect(verifyMercadoPagoSignature({
      signature: `ts=${timestamp},v1=${hash}`,
      requestId,
      dataId,
      secret,
    })).to.equal(true);
    expect(verifyMercadoPagoSignature({
      signature: `ts=${timestamp},v1=00`,
      requestId,
      dataId,
      secret,
    })).to.equal(false);
  });
});

describe("payment fulfillment orchestration", () => {
  function dependencies(
    fulfill: PaymentFulfillmentDependencies["repository"]["fulfill"]
  ) {
    let emailCalls = 0;
    const deps: PaymentFulfillmentDependencies & { emailCalls(): number } = {
      repository: { fulfill },
      now: () => 1700000000000,
      createPurchaseId: () => "purchase-1",
      createTicketId: (_paymentId, index) => `ticket-${index}`,
      signTicket: ({ ticketId }) => `jwt-${ticketId}`,
      sendPurchaseEmail: async () => {
        emailCalls += 1;
      },
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
      emailCalls: () => emailCalls,
    };
    return deps;
  }

  it("envia email somente para um novo processamento aprovado", async () => {
    const deps = dependencies(async () => ({
      outcome: "processed",
      purchaseId: "purchase-1",
      newlyProcessed: true,
      email: {
        purchaseId: "purchase-1",
        userId: "user-1",
        eventId: "event-1",
        ticketsCount: 2,
      },
    }));
    await processProviderPayment("payment-1", payment(), deps);
    expect(deps.emailCalls()).to.equal(1);
  });

  it("webhook repetido nao envia outro email", async () => {
    const deps = dependencies(async () => ({
      outcome: "processed",
      purchaseId: "purchase-1",
      newlyProcessed: false,
    }));
    await processProviderPayment("payment-1", payment(), deps);
    expect(deps.emailCalls()).to.equal(0);
  });

  it("falha de email depois do commit preserva o resultado processado", async () => {
    const deps = dependencies(async () => ({
      outcome: "processed",
      purchaseId: "purchase-1",
      newlyProcessed: true,
      email: {
        purchaseId: "purchase-1",
        userId: "user-1",
        eventId: "event-1",
        ticketsCount: 2,
      },
    }));
    deps.sendPurchaseEmail = async () => {
      throw new Error("smtp unavailable");
    };
    const result = await processProviderPayment("payment-1", payment(), deps);
    expect(result.outcome).to.equal("processed");
  });

  it("falha transitoria e propagada para permitir retry", async () => {
    const deps = dependencies(async () => {
      throw new Error("firestore unavailable");
    });
    try {
      await processProviderPayment("payment-1", payment(), deps);
      expect.fail("deveria propagar a falha");
    } catch (error) {
      expect((error as Error).message).to.equal("firestore unavailable");
    }
  });
});

describe("webhook HTTP layer", () => {
  function signedRequest(secret: string) {
    const paymentId = "payment-1";
    const requestId = "request-1";
    const timestamp = "1700000000";
    const hash = createHmac("sha256", secret)
      .update(`id:${paymentId};request-id:${requestId};ts:${timestamp};`)
      .digest("hex");
    return {
      body: { type: "payment", data: { id: paymentId } },
      headers: {
        "x-request-id": requestId,
        "x-signature": `ts=${timestamp},v1=${hash}`,
      },
    };
  }

  function responseRecorder() {
    let statusCode = 200;
    let payload = "";
    const response = {
      status(code: number) {
        statusCode = code;
        return response;
      },
      send(value: string) {
        payload = value;
        return response;
      },
    };
    return {
      response,
      result: () => ({ statusCode, payload }),
    };
  }

  it("retorna 403 para assinatura invalida", async () => {
    const recorder = responseRecorder();
    const handler = createWebhookHandler({
      webhookSecret: () => "secret",
      getPayment: async () => payment(),
      processPayment: async () => ({ outcome: "processed" }),
    });
    await handler({
      body: { type: "payment", data: { id: "payment-1" } },
      headers: {
        "x-request-id": "request-1",
        "x-signature": "ts=1700000000,v1=00",
      },
    }, recorder.response);
    expect(recorder.result()).to.deep.equal({
      statusCode: 403,
      payload: "Forbidden",
    });
  });

  it("retorna 500 quando Mercado Pago ou Firestore falha", async () => {
    const recorder = responseRecorder();
    const handler = createWebhookHandler({
      webhookSecret: () => "secret",
      getPayment: async () => {
        throw new Error("provider unavailable");
      },
      processPayment: async () => ({ outcome: "processed" }),
    });
    await handler(signedRequest("secret"), recorder.response);
    expect(recorder.result()).to.deep.equal({
      statusCode: 500,
      payload: "Internal Server Error",
    });
  });
});
