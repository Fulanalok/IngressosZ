import { expect } from "chai";
import { HttpsError } from "firebase-functions/v2/https";
import type {
  CreatePaymentSessionInput,
  PaymentEventData,
  PaymentMethod,
  PaymentSessionData,
  PaymentSessionIdentity,
  PaymentSessionRepository,
} from "../../lib/endpoints/paymentSessions.js";
import {
  MAX_PURCHASE_QUANTITY,
} from "../../lib/domain/purchaseLimits.js";
import {
  PAYMENT_SESSION_TTL_MS,
  buildPaymentSession,
  executeCreatePaymentSession,
  executeProviderPayment,
  validateProviderSession,
} from "../../lib/endpoints/paymentSessions.js";

class FakePaymentSessionRepository implements PaymentSessionRepository {
  events = new Map<string, PaymentEventData>();
  sessions = new Map<string, PaymentSessionData & Record<string, unknown>>();
  created?: Record<string, unknown>;
  createCalls = 0;
  claimCalls = 0;
  providerCalls: Array<Record<string, unknown>> = [];

  async createAuthorized(
    input: CreatePaymentSessionInput,
    identity: PaymentSessionIdentity,
    expiresAtMillis: number
  ) {
    this.createCalls += 1;
    const event = this.events.get(input.eventId);
    if (!event) throw new HttpsError("not-found", "Evento nao encontrado.");
    const expiresAt = new Date(expiresAtMillis);
    const data = buildPaymentSession(
      input,
      identity,
      event,
      expiresAt,
      "server-time"
    );
    this.created = data;
    this.sessions.set("session-1", data);
    return { paymentSessionId: "session-1", expiresAt };
  }

  async claimProvider(
    paymentSessionId: string,
    uid: string,
    paymentMethod: PaymentMethod,
    nowMillis: number
  ) {
    this.claimCalls += 1;
    const session = this.sessions.get(paymentSessionId);
    if (!session) {
      throw new HttpsError("not-found", "Sessao de pagamento nao encontrada.");
    }
    const validated = validateProviderSession(
      session,
      uid,
      paymentMethod,
      nowMillis
    );
    session.providerState = "creating";
    return { ...validated };
  }

  async getEvent(eventId: string) {
    return this.events.get(eventId) ?? null;
  }

  async markProviderCreated(
    paymentSessionId: string,
    providerIdField: "preferenceId" | "paymentId",
    providerId: string
  ) {
    const session = this.sessions.get(paymentSessionId)!;
    session.providerState = "created";
    session[providerIdField] = providerId;
    this.providerCalls.push({ state: "created", providerIdField, providerId });
  }

  async markProviderFailed(paymentSessionId: string) {
    const session = this.sessions.get(paymentSessionId)!;
    session.providerState = "failed";
    this.providerCalls.push({ state: "failed" });
  }
}

const now = Date.parse("2026-07-19T12:00:00Z");
const validInput = {
  eventId: "event-1",
  ticketType: "vip",
  quantity: 2,
  paymentMethod: "checkout",
};
const auth = {
  uid: "user-1",
  token: { email: "USER@example.com" },
};

function event(overrides: Partial<PaymentEventData> = {}): PaymentEventData {
  return {
    title: "Evento",
    price: 50,
    pricing: { standard: 50, vip: 75.5, premium: 100 },
    availableTickets: 20,
    inventory: { standard: 10, vip: 5, premium: 5 },
    ...overrides,
  };
}

function session(
  overrides: Partial<PaymentSessionData> = {}
): PaymentSessionData & Record<string, unknown> {
  return {
    ...validInput,
    userId: "user-1",
    userEmail: "user@example.com",
    unitPrice: 75.5,
    totalAmount: 151,
    status: "pending",
    provider: "mercadopago",
    providerState: "ready",
    expiresAt: new Date(now + PAYMENT_SESSION_TTL_MS),
    ...overrides,
  };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.fail(`Esperava erro ${code}`);
  } catch (error) {
    expect((error as { code?: string }).code).to.equal(code);
  }
}

function providerDependencies<T>(
  repository: FakePaymentSessionRepository,
  createProviderPayment: (
    session: PaymentSessionData,
    event: PaymentEventData,
    paymentSessionId: string
  ) => Promise<{ providerId: string; response: T }>
) {
  return {
    repository,
    now: () => now,
    checkRateLimit: async () => true,
    createProviderPayment,
  };
}

describe("createPaymentSession", () => {
  it("exige autenticacao", async () => {
    await expectCode(
      executeCreatePaymentSession(
        { data: validInput },
        new FakePaymentSessionRepository(),
        now
      ),
      "unauthenticated"
    );
  });

  it("rejeita payload null, undefined, primitivo e array", async () => {
    for (const data of [null, undefined, "payload", []]) {
      await expectCode(
        executeCreatePaymentSession(
          { auth, data },
          new FakePaymentSessionRepository(),
          now
        ),
        "invalid-argument"
      );
    }
  });

  it("rejeita campos adicionais e dados confiaveis enviados pelo cliente", async () => {
    for (const field of [
      "extra", "userId", "userEmail", "unitPrice", "totalAmount", "status",
      "provider", "createdAt",
    ]) {
      await expectCode(
        executeCreatePaymentSession(
          { auth, data: { ...validInput, [field]: "client" } },
          new FakePaymentSessionRepository(),
          now
        ),
        "invalid-argument"
      );
    }
  });

  it("rejeita evento inexistente", async () => {
    await expectCode(
      executeCreatePaymentSession(
        { auth, data: validInput },
        new FakePaymentSessionRepository(),
        now
      ),
      "not-found"
    );
  });

  it("rejeita ticketType e paymentMethod invalidos", async () => {
    for (const data of [
      { ...validInput, ticketType: "gold" },
      { ...validInput, paymentMethod: "card" },
    ]) {
      await expectCode(
        executeCreatePaymentSession(
          { auth, data },
          new FakePaymentSessionRepository(),
          now
        ),
        "invalid-argument"
      );
    }
  });

  it("rejeita quantidade fracionaria, zero, negativa e acima do limite", async () => {
    for (const quantity of [1.5, 0, -1, MAX_PURCHASE_QUANTITY + 1]) {
      await expectCode(
        executeCreatePaymentSession(
          { auth, data: { ...validInput, quantity } },
          new FakePaymentSessionRepository(),
          now
        ),
        "invalid-argument"
      );
    }
  });

  it("aplica maxPerPurchase do evento", async () => {
    const repository = new FakePaymentSessionRepository();
    repository.events.set("event-1", event({ maxPerPurchase: 1 }));
    await expectCode(
      executeCreatePaymentSession({ auth, data: validInput }, repository, now),
      "invalid-argument"
    );
  });

  it("rejeita falta de estoque global ou do ticketType", async () => {
    for (const eventData of [
      event({ availableTickets: 1 }),
      event({ inventory: { standard: 10, vip: 1, premium: 5 } }),
    ]) {
      const repository = new FakePaymentSessionRepository();
      repository.events.set("event-1", eventData);
      await expectCode(
        executeCreatePaymentSession({ auth, data: validInput }, repository, now),
        "failed-precondition"
      );
    }
  });

  it("calcula preco, total, identidade, expiracao e timestamps no backend", async () => {
    const repository = new FakePaymentSessionRepository();
    repository.events.set("event-1", event());
    const result = await executeCreatePaymentSession(
      { auth, data: validInput },
      repository,
      now
    );
    expect(result.paymentSessionId).to.equal("session-1");
    expect((result.expiresAt as Date).getTime()).to.equal(
      now + PAYMENT_SESSION_TTL_MS
    );
    expect(repository.created).to.include({
      userId: "user-1",
      userEmail: "user@example.com",
      unitPrice: 75.5,
      totalAmount: 151,
      status: "pending",
      provider: "mercadopago",
      providerState: "ready",
      createdAt: "server-time",
      updatedAt: "server-time",
    });
  });
});

describe("pagamentos autenticados por sessao", () => {
  it("rejeita ausencia de paymentSessionId", async () => {
    await expectCode(
      executeProviderPayment(
        { auth, data: {} },
        "checkout",
        "preferenceId",
        providerDependencies(new FakePaymentSessionRepository(), async () => ({
          providerId: "pref-1",
          response: { id: "pref-1" },
        }))
      ),
      "invalid-argument"
    );
  });

  it("rejeita sessao inexistente, alheia, expirada, nao pendente ou com metodo incorreto", async () => {
    const cases: Array<[Partial<PaymentSessionData> | null, string]> = [
      [null, "not-found"],
      [{ userId: "other" }, "permission-denied"],
      [{ expiresAt: new Date(now - 1) }, "failed-precondition"],
      [{ status: "approved" }, "failed-precondition"],
      [{ provider: "other" }, "failed-precondition"],
      [{ paymentMethod: "pix" }, "failed-precondition"],
    ];
    for (const [overrides, code] of cases) {
      const repository = new FakePaymentSessionRepository();
      repository.events.set("event-1", event());
      if (overrides) repository.sessions.set("session-1", session(overrides));
      await expectCode(
        executeProviderPayment(
          { auth, data: { paymentSessionId: "session-1" } },
          "checkout",
          "preferenceId",
          providerDependencies(repository, async () => ({
            providerId: "pref-1",
            response: { id: "pref-1" },
          }))
        ),
        code
      );
    }
  });

  it("usa somente os dados persistidos na sessao", async () => {
    const repository = new FakePaymentSessionRepository();
    repository.sessions.set("session-1", session());
    repository.events.set("event-1", event());
    let received: PaymentSessionData | undefined;
    const result = await executeProviderPayment(
      { auth, data: { paymentSessionId: "session-1" } },
      "checkout",
      "preferenceId",
      providerDependencies(repository, async (persisted) => {
        received = persisted;
        return { providerId: "pref-1", response: { id: "pref-1" } };
      })
    );
    expect(result).to.deep.equal({ id: "pref-1" });
    expect(received).to.include({
      eventId: "event-1",
      userId: "user-1",
      userEmail: "user@example.com",
      quantity: 2,
      ticketType: "vip",
      unitPrice: 75.5,
      totalAmount: 151,
    });
    expect(repository.sessions.get("session-1")?.providerState).to.equal(
      "created"
    );
  });

  it("processa sessao Pix valida e persiste paymentId", async () => {
    const repository = new FakePaymentSessionRepository();
    repository.sessions.set(
      "session-1",
      session({ paymentMethod: "pix" })
    );
    repository.events.set("event-1", event());
    const result = await executeProviderPayment(
      { auth, data: { paymentSessionId: "session-1" } },
      "pix",
      "paymentId",
      providerDependencies(repository, async (persisted) => ({
        providerId: "pix-1",
        response: { id: "pix-1", total: persisted.totalAmount },
      }))
    );
    expect(result).to.deep.equal({ id: "pix-1", total: 151 });
    expect(repository.sessions.get("session-1")?.paymentId).to.equal("pix-1");
  });

  it("rejeita campos repetidos alem de paymentSessionId", async () => {
    const repository = new FakePaymentSessionRepository();
    for (const field of ["eventId", "quantity", "ticketType", "unitPrice"]) {
      await expectCode(
        executeProviderPayment(
          {
            auth,
            data: { paymentSessionId: "session-1", [field]: "client" },
          },
          "checkout",
          "preferenceId",
          providerDependencies(repository, async () => ({
            providerId: "pref-1",
            response: { id: "pref-1" },
          }))
        ),
        "invalid-argument"
      );
    }
    expect(repository.claimCalls).to.equal(0);
  });

  it("impede duas criacoes concorrentes", async () => {
    const repository = new FakePaymentSessionRepository();
    repository.sessions.set("session-1", session());
    repository.events.set("event-1", event());
    let release!: () => void;
    const blockedProvider = new Promise<void>((resolve) => { release = resolve; });
    const deps = providerDependencies(repository, async () => {
      await blockedProvider;
      return { providerId: "pref-1", response: { id: "pref-1" } };
    });
    const first = executeProviderPayment(
      { auth, data: { paymentSessionId: "session-1" } },
      "checkout",
      "preferenceId",
      deps
    );
    await Promise.resolve();
    await expectCode(
      executeProviderPayment(
        { auth, data: { paymentSessionId: "session-1" } },
        "checkout",
        "preferenceId",
        deps
      ),
      "already-exists"
    );
    release();
    await first;
  });

  it("permite retry depois de providerState failed", async () => {
    const repository = new FakePaymentSessionRepository();
    repository.sessions.set("session-1", session());
    repository.events.set("event-1", event());
    const failing = providerDependencies(repository, async () => {
      throw new Error("provider down");
    });
    let failed = false;
    try {
      await executeProviderPayment(
        { auth, data: { paymentSessionId: "session-1" } },
        "checkout",
        "preferenceId",
        failing
      );
    } catch {
      failed = true;
    }
    expect(failed).to.equal(true);
    expect(repository.sessions.get("session-1")?.providerState).to.equal(
      "failed"
    );
    const retry = await executeProviderPayment(
      { auth, data: { paymentSessionId: "session-1" } },
      "checkout",
      "preferenceId",
      providerDependencies(repository, async () => ({
        providerId: "pref-retry",
        response: { id: "pref-retry" },
      }))
    );
    expect(retry).to.deep.equal({ id: "pref-retry" });
  });

  it("mock do emulador ainda exige auth e sessao valida", async () => {
    let providerCalled = false;
    const repository = new FakePaymentSessionRepository();
    const deps = providerDependencies(repository, async () => {
      providerCalled = true;
      return { providerId: "mock", response: { id: "mock" } };
    });
    await expectCode(
      executeProviderPayment(
        { data: { paymentSessionId: "session-1" } },
        "checkout",
        "preferenceId",
        deps
      ),
      "unauthenticated"
    );
    expect(providerCalled).to.equal(false);
    repository.sessions.set("session-1", session());
    repository.events.set("event-1", event());
    await executeProviderPayment(
      { auth, data: { paymentSessionId: "session-1" } },
      "checkout",
      "preferenceId",
      deps
    );
    expect(providerCalled).to.equal(true);
  });
});
