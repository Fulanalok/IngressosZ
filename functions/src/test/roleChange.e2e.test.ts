import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import { expect } from "chai";
import {
  executeRoleChange,
  RoleChangeFailure,
  type RoleAuthGateway,
} from "../../lib/auth/roleChange.js";
import { firebaseRoleChangeRepository } from "../../lib/infrastructure/roleChangeFirebase.js";

class EmulatorAuth implements RoleAuthGateway {
  claims: Record<string, unknown> = { role: "user", unrelated: "preserved" };
  failSet = true;

  async getClaims() { return this.claims; }
  async setClaims(_uid: string, claims: Record<string, unknown>) {
    if (this.failSet) throw new Error("injected");
    this.claims = claims;
  }
  async revokeRefreshTokens() {}
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
    const db = getFirestore();
    await db.recursiveDelete(db.collection("authorization"));
    await db.recursiveDelete(db.collection("users"));
  });

  it("bloqueia na reserva, rejeita concorrência e retoma a mesma operação", async () => {
    const auth = new EmulatorAuth();
    let sequence = 0;
    const dependencies = {
      repository: firebaseRoleChangeRepository,
      auth,
      operationId: () => `operation-${++sequence}`,
    };

    try {
      await executeRoleChange("target-a", "admin", "admin-a", dependencies);
      expect.fail("Era esperada falha injetada.");
    } catch (error) {
      expect(error).to.be.instanceOf(RoleChangeFailure);
    }

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

    try {
      await executeRoleChange("target-a", "validator", "admin-b", dependencies);
      expect.fail("Era esperado conflito.");
    } catch (error) {
      expect((error as RoleChangeFailure).code).to.equal("ROLE_CHANGE_CONFLICT");
    }

    auth.failSet = false;
    const result = await executeRoleChange(
      "target-a",
      "admin",
      "admin-b",
      dependencies
    );
    expect(result.roleVersion).to.equal(1);

    const completed = (await getFirestore()
      .collection("authorization").doc("target-a").get()).data();
    expect(completed).to.include({
      role: "admin",
      roleVersion: 1,
      status: "active",
    });
    expect(completed?.desiredRole).to.equal(null);
    const profile = (await getFirestore()
      .collection("users").doc("target-a").get()).data();
    expect(profile?.role).to.equal("admin");
    const operation = (await getFirestore()
      .collection("authorization").doc("target-a")
      .collection("operations").doc("operation-1").get()).data();
    expect(operation).to.include({
      operationId: "operation-1",
      targetUid: "target-a",
      previousRole: "user",
      desiredRole: "admin",
      roleVersion: 1,
      status: "succeeded",
      requestedBy: "admin-a",
      attempts: 2,
    });
    expect(operation).not.to.have.property("failedAt");
    expect(auth.claims.unrelated).to.equal("preserved");
  });
});
