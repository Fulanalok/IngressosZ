import { expect } from "chai";
import { describe, it } from "mocha";
import {
  PROVIDER_CREATING_LEASE_MS,
  classifyPaymentSessionExpiration,
  isApprovedAfterInitiationExpiry,
  isPersistedApprovalAfterInitiationExpiry,
  resolveLegacyApprovalTiming,
} from "../../lib/domain/paymentSessionLifecycle.js";
import { classifyFulfillmentSessionStatus } from
  "../../lib/domain/paymentFulfillment.js";

const nowMillis = Date.parse("2026-07-22T12:00:00.000Z");
const expiredAt = new Date(nowMillis - 1);
const futureAt = new Date(nowMillis + 1);

describe("payment session maintenance classifier", () => {
  function classify(
    providerState: string,
    expiresAt: unknown = expiredAt,
    providerStartedAt?: unknown,
    status = "pending"
  ) {
    return classifyPaymentSessionExpiration({
      session: { status, providerState, expiresAt, providerStartedAt },
      nowMillis,
      providerCreatingLeaseMs: PROVIDER_CREATING_LEASE_MS,
    });
  }

  it("mantem ready antes de expiresAt", () => {
    expect(classify("ready", futureAt)).to.deep.equal({
      result: "invalid_or_not_due",
    });
  });

  it("expira ready depois de expiresAt", () => {
    expect(classify("ready")).to.deep.equal({
      result: "expire_provider_not_started",
      expirationReason: "provider_not_started",
    });
  });

  it("expira ready exatamente em expiresAt", () => {
    expect(classify("ready", new Date(nowMillis))).to.deep.equal({
      result: "expire_provider_not_started",
      expirationReason: "provider_not_started",
    });
  });

  it("expira failed depois de expiresAt", () => {
    expect(classify("failed")).to.deep.equal({
      result: "expire_provider_attempt_failed",
      expirationReason: "provider_attempt_failed",
    });
  });

  it("mantem creating com lease ativo", () => {
    expect(classify(
      "creating",
      expiredAt,
      new Date(nowMillis - PROVIDER_CREATING_LEASE_MS + 1)
    )).to.deep.equal({ result: "keep_active_provider_attempt" });
  });

  it("expira creating com lease vencido", () => {
    expect(classify(
      "creating",
      expiredAt,
      new Date(nowMillis - PROVIDER_CREATING_LEASE_MS)
    )).to.deep.equal({
      result: "expire_provider_attempt_stale",
      expirationReason: "provider_attempt_stale",
    });
  });

  it("nunca expira providerState created pelo prazo de iniciacao", () => {
    expect(classify("created")).to.deep.equal({
      result: "keep_provider_created",
    });
  });

  for (const status of ["approved", "refund_required"]) {
    it(`nunca altera status terminal ${status}`, () => {
      expect(classify("ready", expiredAt, undefined, status)).to.deep.equal({
        result: "keep_terminal",
      });
    });
  }

  it("nao atualiza timestamps invalidos", () => {
    expect(classify("ready", "invalido")).to.deep.equal({
      result: "invalid_or_not_due",
    });
    expect(classify("creating", expiredAt, "invalido")).to.deep.equal({
      result: "invalid_or_not_due",
    });
  });
});
describe("approved after initiation expiry", () => {
  it("distingue pending antes e depois de expiresAt", () => {
    expect(isApprovedAfterInitiationExpiry({
      status: "pending",
      expiresAt: futureAt,
    }, nowMillis)).to.equal(false);
    expect(isApprovedAfterInitiationExpiry({
      status: "pending",
      expiresAt: expiredAt,
    }, nowMillis)).to.equal(true);
  });

  it("considera status expired como aprovacao depois do prazo", () => {
    expect(isApprovedAfterInitiationExpiry({
      status: "expired",
      expiresAt: undefined,
    }, nowMillis)).to.equal(true);
  });

  it("considera expiresAt igual ao instante da aprovacao como vencido", () => {
    expect(isApprovedAfterInitiationExpiry({
      status: "pending",
      expiresAt: new Date(nowMillis),
    }, nowMillis)).to.equal(true);
  });

  it("usa approvedAt, e nao o relogio do replay, para sessao approved", () => {
    expect(isPersistedApprovalAfterInitiationExpiry({
      approvedAt: new Date(nowMillis - 2000),
      expiresAt: new Date(nowMillis - 1000),
    })).to.equal(false);
    expect(isPersistedApprovalAfterInitiationExpiry({
      approvedAt: new Date(nowMillis),
      expiresAt: new Date(nowMillis - 1000),
    })).to.equal(true);
    expect(isPersistedApprovalAfterInitiationExpiry({
      approvedAt: undefined,
      expiresAt: new Date(nowMillis - 1000),
    })).to.equal(false);
  });

  it("preserva indicador persistido na sessao ou compra", () => {
    expect(isPersistedApprovalAfterInitiationExpiry({
      approvedAfterInitiationExpiry: true,
    })).to.equal(true);
    expect(isPersistedApprovalAfterInitiationExpiry({}, {
      approvedAfterInitiationExpiry: true,
    })).to.equal(true);
  });

  it("resolve approvedAt legado antes de createdAt", () => {
    const timing = resolveLegacyApprovalTiming({
      expiresAt: new Date(nowMillis),
    }, {
      approvedAt: new Date(nowMillis - 2000),
      createdAt: new Date(nowMillis + 2000),
    });
    expect(timing).to.deep.equal({
      originalApprovalMillis: nowMillis - 2000,
      approvedAtMillis: nowMillis - 2000,
      shouldRepairApprovedAt: true,
      approvedAfterInitiationExpiry: false,
    });
  });

  it("usa createdAt legado como fallback e aplica a fronteira inclusiva", () => {
    const atExpiry = resolveLegacyApprovalTiming({
      expiresAt: new Date(nowMillis),
    }, {
      approvedAt: "invalido",
      createdAt: new Date(nowMillis),
    });
    expect(atExpiry).to.include({
      originalApprovalMillis: nowMillis,
      approvedAtMillis: nowMillis,
      shouldRepairApprovedAt: true,
      approvedAfterInitiationExpiry: true,
    });
    expect(resolveLegacyApprovalTiming({
      expiresAt: new Date(nowMillis),
    }, {
      createdAt: new Date(nowMillis + 1),
    }).approvedAfterInitiationExpiry).to.equal(true);
  });

  it("nao usa retry como fallback e preserva evidencia existente", () => {
    expect(resolveLegacyApprovalTiming({
      expiresAt: new Date(nowMillis - 1000),
    }, {
      approvedAt: undefined,
      createdAt: "invalido",
    })).to.deep.equal({
      shouldRepairApprovedAt: false,
      approvedAfterInitiationExpiry: false,
    });
    expect(resolveLegacyApprovalTiming({
      approvedAt: new Date(nowMillis - 2000),
      expiresAt: new Date(nowMillis),
    }, {}).approvedAtMillis).to.equal(nowMillis - 2000);
    expect(resolveLegacyApprovalTiming({}, {
      approvedAfterInitiationExpiry: true,
    }).approvedAfterInitiationExpiry).to.equal(true);
  });

  for (const providerState of ["created", "creating", "failed"]) {
    it(`aceita expired com providerState ${providerState}`, () => {
      expect(classifyFulfillmentSessionStatus({
        status: "expired",
        providerState,
      })).to.deep.equal({ kind: "valid" });
    });
  }

  it("rejeita expired sem tentativa no provider", () => {
    expect(classifyFulfillmentSessionStatus({
      status: "expired",
      providerState: "ready",
    })).to.deep.include({
      kind: "permanent",
      reason: "expired_without_provider_attempt",
    });
  });

  for (const status of ["refund_required", "desconhecido"]) {
    it(`rejeita fulfillment para status ${status}`, () => {
      expect(classifyFulfillmentSessionStatus({
        status,
        providerState: "created",
      })).to.deep.include({
        kind: "permanent",
        reason: "invalid_session_status",
      });
    });
  }
});
