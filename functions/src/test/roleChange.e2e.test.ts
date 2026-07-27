import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { expect } from "chai";
import {
  executeRoleChange,
  RoleChangeFailure,
  type RoleAuthGateway,
  type RoleReservation,
} from "../../lib/auth/roleChange.js";
import { firebaseRoleChangeRepository } from "../../lib/infrastructure/roleChangeFirebase.js";

class EmulatorAuth implements RoleAuthGateway {
  claims: Record<string, unknown> = { role: "user", unrelated: "preserved" };
  failSet = false;
  private waiting = 0;
  private releaseBarrier: (() => void) | null = null;
  private barrier: Promise<void> | null = null;
  private getClaimsCount = 0;
  private getClaimsWaiters: Array<{ count: number; resolve: () => void }> = [];
  onGetClaims: (() => Promise<void>) | null = null;

  blockGetClaims(expected: number) {
    this.barrier = new Promise((resolve) => {
      this.releaseBarrier = resolve;
    });
    this.waiting = -expected;
  }

  release() {
    this.releaseBarrier?.();
  }

  async waitForGetClaims(count: number) {
    if (this.getClaimsCount >= count) return;
    await new Promise<void>((resolve) => {
      this.getClaimsWaiters.push({ count, resolve });
    });
  }

  async getClaims() {
    await this.onGetClaims?.();
    this.onGetClaims = null;
    this.getClaimsCount += 1;
    for (const waiter of this.getClaimsWaiters) {
      if (this.getClaimsCount >= waiter.count) waiter.resolve();
    }
    this.getClaimsWaiters = this.getClaimsWaiters.filter(
      (waiter) => this.getClaimsCount < waiter.count
    );
    if (this.barrier) {
      this.waiting += 1;
      if (this.waiting === 0) this.release();
      await this.barrier;
    }
    return this.claims;
  }

  async setClaims(_uid: string, claims: Record<string, unknown>) {
    if (this.failSet) throw new Error("injected");
    this.claims = claims;
  }

  async revokeRefreshTokens() {}
}

let operationSequence = 0;

function dependencies(auth: EmulatorAuth) {
  return {
    repository: firebaseRoleChangeRepository,
    auth,
    operationId: () => `operation-${++operationSequence}`,
  };
}

async function seedActive(
  uid: string,
  role: "user" | "organizer" | "validator" | "admin" = "user",
  roleVersion = 1
) {
  await getFirestore().collection("authorization").doc(uid).set({
    role,
    roleVersion,
    status: "active",
    desiredRole: null,
    operationId: null,
  });
}

function reservationInput(uid: string, desiredRole: "admin" | "validator") {
  return {
    targetUid: uid,
    desiredRole,
    requestedBy: "admin-a",
    operationId: `operation-${++operationSequence}`,
  };
}

describe("role change Firestore integration", () => {
  before(async function() {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error("FIRESTORE_EMULATOR_HOST é obrigatório.");
    }
    if (!admin.apps.length) {
      admin.initializeApp({ projectId: "demo-ingressosz" });
    }
  });

  beforeEach(async () => {
    operationSequence = 0;
    const db = getFirestore();
    await db.recursiveDelete(db.collection("authorization"));
    await db.recursiveDelete(db.collection("users"));
  });

  it("bloqueia na reserva e retoma a mesma operação", async () => {
    const auth = new EmulatorAuth();
    auth.failSet = true;
    const deps = dependencies(auth);

    const first = await Promise.allSettled([
      executeRoleChange("target-a", "admin", "admin-a", deps),
    ]);
    expect(first[0].status).to.equal("rejected");

    const blocked = (await getFirestore()
      .collection("authorization").doc("target-a").get()).data();
    expect(blocked).to.include({
      role: "user",
      roleVersion: 1,
      status: "error",
      desiredRole: "admin",
      operationId: "operation-1",
      lastErrorCode: "AUTH_SET_CLAIMS_FAILED",
    });

    auth.failSet = false;
    const result = await executeRoleChange("target-a", "admin", "admin-b", deps);
    expect(result.roleVersion).to.equal(1);
    const operation = (await getFirestore()
      .collection("authorization").doc("target-a")
      .collection("operations").doc("operation-1").get()).data();
    expect(operation).to.include({ status: "succeeded", attempts: 2 });
    expect(auth.claims.unrelated).to.equal("preserved");
  });

  it("duas mudanças simultâneas iguais compartilham versão e operação", async () => {
    await seedActive("same", "user", 4);
    const auth = new EmulatorAuth();
    auth.blockGetClaims(2);
    const deps = dependencies(auth);

    const results = await Promise.allSettled([
      executeRoleChange("same", "admin", "admin-a", deps),
      executeRoleChange("same", "admin", "admin-b", deps),
    ]);

    expect(results.map((result) => result.status))
      .to.deep.equal(["fulfilled", "fulfilled"]);
    const values = results.map((result) =>
      result.status === "fulfilled" ? result.value : null
    );
    expect(values[0]?.roleVersion).to.equal(5);
    expect(values[1]?.roleVersion).to.equal(5);
    expect(values[0]?.operationId).to.equal(values[1]?.operationId);
    const authRef = getFirestore().collection("authorization").doc("same");
    expect((await authRef.get()).data()).to.include({
      role: "admin",
      roleVersion: 5,
      status: "active",
    });
    const operations = await authRef.collection("operations").get();
    expect(operations.size).to.equal(1);
    expect(operations.docs[0].data()).to.include({
      roleVersion: 5,
      status: "succeeded",
      attempts: 2,
    });
  });

  it("estado autoritativo criado durante descoberta prevalece", async () => {
    const auth = new EmulatorAuth();
    auth.onGetClaims = async () => {
      await seedActive("discovery-race", "admin", 7);
    };
    const result = await executeRoleChange(
      "discovery-race",
      "user",
      "admin-a",
      dependencies(auth)
    );
    expect(result.roleVersion).to.equal(8);
    expect((await getFirestore().collection("authorization")
      .doc("discovery-race").get()).data()).to.include({
      role: "user",
      roleVersion: 8,
      status: "active",
    });
  });

  it("mudanças simultâneas diferentes permitem apenas uma reserva", async () => {
    await seedActive("different");
    const auth = new EmulatorAuth();
    auth.blockGetClaims(99);
    const deps = dependencies(auth);
    const first = executeRoleChange("different", "admin", "admin-a", deps);
    await auth.waitForGetClaims(1);
    const second = executeRoleChange("different", "validator", "admin-b", deps);
    const resultsPromise = Promise.allSettled([first, second]);
    await second.then(() => undefined, () => undefined);
    auth.release();

    const results = await resultsPromise;
    expect(results[0].status).to.equal("fulfilled");
    expect(results[1].status).to.equal("rejected");
    const reason = results[1].status === "rejected" ? results[1].reason : null;
    expect(reason).to.be.instanceOf(RoleChangeFailure);
    expect((reason as RoleChangeFailure).code).to.equal("ROLE_CHANGE_CONFLICT");
    const authRef = getFirestore().collection("authorization").doc("different");
    expect((await authRef.get()).data()).to.include({
      role: "admin",
      roleVersion: 2,
      status: "active",
    });
    expect((await authRef.collection("operations").get()).size).to.equal(1);
  });

  it("duas finalizações simultâneas da mesma operação são idempotentes", async () => {
    await seedActive("finalize");
    const reservation = await firebaseRoleChangeRepository.reserve(
      reservationInput("finalize", "admin")
    ) as RoleReservation;

    const results = await Promise.allSettled([
      firebaseRoleChangeRepository.finalize(reservation),
      firebaseRoleChangeRepository.finalize(reservation),
    ]);
    expect(results.map((result) => result.status))
      .to.deep.equal(["fulfilled", "fulfilled"]);
    expect((await getFirestore().collection("authorization")
      .doc("finalize").get()).data()).to.include({
      role: "admin",
      roleVersion: 2,
      status: "active",
    });
  });

  it("operação antiga não finaliza uma versão posterior", async () => {
    await seedActive("stale");
    const oldReservation = await firebaseRoleChangeRepository.reserve(
      reservationInput("stale", "admin")
    ) as RoleReservation;
    await firebaseRoleChangeRepository.finalize(oldReservation);
    const currentReservation = await firebaseRoleChangeRepository.reserve(
      reservationInput("stale", "validator")
    ) as RoleReservation;

    const [oldResult] = await Promise.allSettled([
      firebaseRoleChangeRepository.finalize(oldReservation),
      Promise.resolve(currentReservation),
    ]);
    expect(oldResult.status).to.equal("rejected");
    const reason = oldResult.status === "rejected" ? oldResult.reason : null;
    expect((reason as RoleChangeFailure).code).to.equal("FINALIZE_CONFLICT");
    expect((await getFirestore().collection("authorization")
      .doc("stale").get()).data()).to.include({
      roleVersion: 3,
      status: "applying",
      desiredRole: "validator",
    });
  });

  it("rejeita finalização com operação ausente ou inconsistente", async () => {
    await seedActive("invalid-operation");
    const reservation = await firebaseRoleChangeRepository.reserve(
      reservationInput("invalid-operation", "admin")
    ) as RoleReservation;
    const operationRef = getFirestore().collection("authorization")
      .doc("invalid-operation").collection("operations")
      .doc(reservation.operationId);
    await operationRef.delete();
    const missing = await Promise.allSettled([
      firebaseRoleChangeRepository.finalize(reservation),
    ]);
    expect(missing[0].status).to.equal("rejected");
    expect((missing[0] as PromiseRejectedResult).reason.code)
      .to.equal("FINALIZE_CONFLICT");

    await operationRef.set({
      operationId: reservation.operationId,
      targetUid: reservation.targetUid,
      desiredRole: "validator",
      roleVersion: reservation.roleVersion,
      status: "applying",
    });
    const inconsistent = await Promise.allSettled([
      firebaseRoleChangeRepository.finalize(reservation),
    ]);
    expect(inconsistent[0].status).to.equal("rejected");
    expect((inconsistent[0] as PromiseRejectedResult).reason.code)
      .to.equal("FINALIZE_CONFLICT");
  });
});
