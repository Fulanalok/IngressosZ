import { expect } from "chai";
import { getApps, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import { after, before, beforeEach, describe, it } from "mocha";
import { PROVIDER_CREATING_LEASE_MS } from
  "../../lib/domain/paymentSessionLifecycle.js";
import { expireStalePaymentSessionsInFirestore } from
  "../../lib/infrastructure/paymentSessionMaintenanceFirestore.js";

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || "demo-ingressosz";
process.env.GOOGLE_CLOUD_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || "demo-ingressosz";

const nowMillis = Date.parse("2026-07-22T12:00:00.000Z");
const logs: Array<{ message: string; data?: Record<string, unknown> }> = [];
const logger = {
  info: (message: string, data?: Record<string, unknown>) => {
    logs.push({ message, data });
  },
  warn: (message: string, data?: Record<string, unknown>) => {
    logs.push({ message, data });
  },
};

describe("Payment Session Maintenance Integration Tests", () => {
  before(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error(
        "FIRESTORE_EMULATOR_HOST ausente; execute npm run test:maintenance na raiz."
      );
    }
    if (!getApps().length) initializeApp({ projectId: "demo-ingressosz" });
  });

  beforeEach(async () => {
    const snapshot = await getFirestore().collection("paymentSessions").get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
    logs.length = 0;
  });

  after(async () => {
    const snapshot = await getFirestore().collection("paymentSessions").get();
    await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
  });

  async function seed(
    id: string,
    overrides: Record<string, unknown> = {}
  ) {
    await getFirestore().collection("paymentSessions").doc(id).set({
      status: "pending",
      providerState: "ready",
      expiresAt: Timestamp.fromMillis(nowMillis - 1000),
      updatedAt: Timestamp.fromMillis(nowMillis - 2000),
      ...overrides,
    });
  }

  async function run(options: {
    pageSize?: number;
    beforeCandidateTransaction?(id: string): Promise<void>;
  } = {}) {
    return expireStalePaymentSessionsInFirestore({
      db: getFirestore(),
      nowMillis,
      logger,
      pageSize: options.pageSize,
      beforeCandidateTransaction: options.beforeCandidateTransaction,
    });
  }

  for (const paymentCase of [
    {
      state: "ready",
      reason: "provider_not_started",
    },
    {
      state: "failed",
      reason: "provider_attempt_failed",
    },
  ]) {
    it(`expira ${paymentCase.state} com o motivo correto`, async () => {
      await seed(`session-${paymentCase.state}`, {
        providerState: paymentCase.state,
      });
      const summary = await run();
      const data = (await getFirestore().collection("paymentSessions")
        .doc(`session-${paymentCase.state}`).get()).data();
      expect(data).to.include({
        status: "expired",
        providerState: paymentCase.state,
        expirationReason: paymentCase.reason,
      });
      expect(data?.expiredAt.toMillis()).to.equal(nowMillis);
      expect(summary).to.include({ candidatesRead: 1, expired: 1 });
    });
  }

  it("mantem creating com lease ativo", async () => {
    await seed("session-creating-active", {
      providerState: "creating",
      providerStartedAt: Timestamp.fromMillis(
        nowMillis - PROVIDER_CREATING_LEASE_MS + 1
      ),
    });
    const summary = await run();
    expect((await getFirestore().collection("paymentSessions")
      .doc("session-creating-active").get()).data()?.status).to.equal("pending");
    expect(summary.ignoredActiveProviderAttempt).to.equal(1);
  });

  it("expira creating com lease vencido e preserva evidencias", async () => {
    await seed("session-creating-stale", {
      providerState: "creating",
      providerStartedAt: Timestamp.fromMillis(
        nowMillis - PROVIDER_CREATING_LEASE_MS
      ),
      providerAttemptId: "attempt-1",
      preferenceId: "preference-1",
      paymentId: "payment-1",
    });
    await run();
    expect((await getFirestore().collection("paymentSessions")
      .doc("session-creating-stale").get()).data()).to.include({
      status: "expired",
      providerState: "creating",
      providerAttemptId: "attempt-1",
      preferenceId: "preference-1",
      paymentId: "payment-1",
      expirationReason: "provider_attempt_stale",
    });
  });

  it("nao consulta providerState created vencido", async () => {
    await seed("session-created", { providerState: "created" });
    const summary = await run();
    expect((await getFirestore().collection("paymentSessions")
      .doc("session-created").get()).data()?.status).to.equal("pending");
    expect(summary.candidatesRead).to.equal(0);
  });

  for (const status of ["approved", "refund_required"]) {
    it(`preserva sessao ${status}`, async () => {
      await seed(`session-${status}`, { status, providerState: "failed" });
      const summary = await run();
      expect((await getFirestore().collection("paymentSessions")
        .doc(`session-${status}`).get()).data()?.status).to.equal(status);
      expect(summary.candidatesRead).to.equal(0);
    });
  }

  it("pagina todas as candidatas com limite pequeno", async () => {
    for (let index = 0; index < 5; index += 1) {
      await seed(`session-page-${index}`, {
        expiresAt: Timestamp.fromMillis(nowMillis - 5000 + index),
      });
    }
    const summary = await run({ pageSize: 2 });
    const snapshot = await getFirestore().collection("paymentSessions")
      .where("status", "==", "expired").get();
    expect(summary).to.include({ candidatesRead: 5, expired: 5 });
    expect(snapshot.size).to.equal(5);
  });

  it("nao sobrescreve aprovacao concorrente", async () => {
    await seed("session-concurrent");
    let changed = false;
    const summary = await run({
      beforeCandidateTransaction: async (id) => {
        if (!changed && id === "session-concurrent") {
          changed = true;
          await getFirestore().collection("paymentSessions").doc(id).update({
            status: "approved",
          });
        }
      },
    });
    expect((await getFirestore().collection("paymentSessions")
      .doc("session-concurrent").get()).data()?.status).to.equal("approved");
    expect(summary).to.include({ expired: 0, concurrentConflicts: 1 });
  });

  it("e idempotente em execucoes repetidas", async () => {
    await seed("session-idempotent", {
      providerState: "failed",
      providerAttemptId: "attempt-idempotent",
    });
    const first = await run();
    const original = (await getFirestore().collection("paymentSessions")
      .doc("session-idempotent").get()).data();
    const second = await run();
    const repeated = (await getFirestore().collection("paymentSessions")
      .doc("session-idempotent").get()).data();
    expect(first.expired).to.equal(1);
    expect(second).to.include({ candidatesRead: 0, expired: 0 });
    expect(repeated?.expiredAt.toMillis()).to.equal(original?.expiredAt.toMillis());
    expect(repeated?.providerAttemptId).to.equal("attempt-idempotent");
  });
});
