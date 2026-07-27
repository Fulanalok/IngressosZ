import { expect } from "chai";
import {
  executeRoleChange,
  authLookupErrorCode,
  classifyLegacyAuthorization,
  ROLE_CHANGE_ERROR_CODES,
  RoleChangeFailure,
  type RoleAuthGateway,
  type RoleChangeRepository,
  type RoleReservation,
} from "../../lib/auth/roleChange.js";
import type { AuthClaims, UserRole } from "../../lib/auth/authorization.js";

class FakeRepository implements RoleChangeRepository {
  exists = true;
  role: UserRole = "user";
  roleVersion = 1;
  status: "active" | "applying" | "error" = "active";
  desiredRole: UserRole | null = null;
  operationId: string | null = null;
  attempts = 0;
  failFinalize = false;
  failMarkFailed = false;
  operationCount = 0;
  trace: string[] = [];

  async reserve(input: {
    targetUid: string;
    desiredRole: UserRole;
    requestedBy: string;
    operationId: string;
  }): Promise<RoleReservation | null> {
    this.trace.push("reserve");
    if (!this.exists) return null;
    if (this.status !== "active") {
      if (this.desiredRole !== input.desiredRole) {
        throw new RoleChangeFailure("ROLE_CHANGE_CONFLICT", "conflict");
      }
      this.status = "applying";
      this.attempts += 1;
      return this.reservation(input.targetUid);
    }
    if (this.role === input.desiredRole) {
      return { ...this.reservation(input.targetUid), completed: true };
    }
    this.roleVersion += 1;
    this.status = "applying";
    this.desiredRole = input.desiredRole;
    this.operationId = input.operationId;
    this.attempts += 1;
    this.operationCount += 1;
    return this.reservation(input.targetUid);
  }

  async initializeLegacy(input: {
    targetUid: string;
    desiredRole: UserRole;
    requestedBy: string;
    operationId: string;
    discovery: { kind: "common" } |
      { kind: "privileged"; role: Exclude<UserRole, "user"> } |
      { kind: "contradictory" };
  }): Promise<RoleReservation> {
    this.trace.push("initializeLegacy");
    if (this.exists) {
      return (await this.reserve(input)) as RoleReservation;
    }
    if (input.discovery.kind === "privileged") {
      throw new RoleChangeFailure("MIGRATION_REQUIRED", "migration");
    }
    if (input.discovery.kind === "contradictory") {
      throw new RoleChangeFailure("MANUAL_REVIEW_REQUIRED", "manual");
    }
    this.exists = true;
    this.role = "user";
    this.roleVersion = 1;
    this.status = "applying";
    this.desiredRole = input.desiredRole;
    this.operationId = input.operationId;
    this.attempts += 1;
    this.operationCount += 1;
    return this.reservation(input.targetUid);
  }

  reservation(targetUid: string): RoleReservation {
    return {
      targetUid,
      previousRole: this.role,
      desiredRole: this.desiredRole ?? this.role,
      roleVersion: this.roleVersion,
      operationId: this.operationId ?? "completed",
      completed: false,
    };
  }

  async markFailed(reservation: RoleReservation, errorCode: string) {
    if (this.failMarkFailed) throw new Error("mark-failed");
    if (reservation.operationId === this.operationId) this.status = "error";
    void errorCode;
  }

  async finalize(reservation: RoleReservation) {
    if (this.failFinalize) throw new Error("finalize");
    if (reservation.operationId !== this.operationId ||
        reservation.roleVersion !== this.roleVersion) {
      throw new RoleChangeFailure(
        ROLE_CHANGE_ERROR_CODES.finalizeConflict,
        "stale"
      );
    }
    this.role = reservation.desiredRole;
    this.status = "active";
    this.desiredRole = null;
    this.operationId = null;
  }
}

class FakeAuth implements RoleAuthGateway {
  claims: AuthClaims = { role: "user", featureFlag: "keep" };
  failSet = false;
  failRevoke = false;
  failGet = false;
  getErrorCode = "auth/user-not-found";
  getCalls = 0;
  setCalls = 0;
  revokeCalls = 0;
  trace: string[] = [];

  async getClaims() {
    this.getCalls += 1;
    this.trace.push("getClaims");
    if (this.failGet) {
      throw Object.assign(new Error("lookup"), { code: this.getErrorCode });
    }
    return this.claims;
  }
  async setClaims(_uid: string, claims: AuthClaims) {
    this.setCalls += 1;
    if (this.failSet) throw new Error("set");
    this.claims = claims;
  }
  async revokeRefreshTokens() {
    this.revokeCalls += 1;
    if (this.failRevoke) throw new Error("revoke");
  }
}

function dependencies(repository: FakeRepository, auth: FakeAuth) {
  return { repository, auth, operationId: () => "operation-a" };
}

async function expectFailure(promise: Promise<unknown>, code: string) {
  let caught: unknown;
  try {
    await promise;
  } catch (error) {
    caught = error;
  }
  expect(caught).to.be.instanceOf(RoleChangeFailure);
  expect((caught as RoleChangeFailure).code).to.equal(code);
}

describe("role change orchestration", () => {
  it("reserva autorização existente antes de consultar claims", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    const trace: string[] = [];
    repository.trace = trace;
    auth.trace = trace;
    await executeRoleChange(
      "target",
      "admin",
      "requester",
      dependencies(repository, auth)
    );
    expect(trace.slice(0, 2)).to.deep.equal(["reserve", "getClaims"]);
  });

  it("classifica somente claims privilegiadas coerentes", () => {
    expect(classifyLegacyAuthorization({ role: "admin", admin: true }))
      .to.deep.equal({ kind: "privileged", role: "admin" });
    expect(classifyLegacyAuthorization({ role: "organizer" }))
      .to.deep.equal({ kind: "privileged", role: "organizer" });
    expect(classifyLegacyAuthorization({ role: "validator", admin: false }))
      .to.deep.equal({ kind: "privileged", role: "validator" });
    for (const claims of [
      { role: "admin" },
      { role: "organizer", admin: true },
      { role: "validator", admin: true },
      { role: "user", admin: true },
      { admin: true },
    ]) {
      expect(classifyLegacyAuthorization(claims))
        .to.deep.equal({ kind: "contradictory" });
    }
  });

  it("normaliza falhas de lookup sem inferir descoberta", () => {
    expect(authLookupErrorCode({ code: "auth/user-not-found" }))
      .to.equal("AUTH_USER_NOT_FOUND");
    expect(authLookupErrorCode({ code: "auth/internal-error" }))
      .to.equal("AUTH_LOOKUP_FAILED");
    expect(authLookupErrorCode(new Error("network")))
      .to.equal("AUTH_LOOKUP_FAILED");
  });

  it("descobre usuário comum ausente e inicializa fail-closed", async () => {
    const repository = new FakeRepository();
    repository.exists = false;
    const auth = new FakeAuth();
    const result = await executeRoleChange(
      "target",
      "organizer",
      "requester",
      dependencies(repository, auth)
    );
    expect(result.roleVersion).to.equal(1);
    expect(repository.role).to.equal("organizer");
    expect(repository.trace).to.deep.equal(["reserve", "initializeLegacy"]);
  });

  it("exige migração ou revisão para claims legadas privilegiadas", async () => {
    const repository = new FakeRepository();
    repository.exists = false;
    const auth = new FakeAuth();
    auth.claims = { role: "admin", admin: true };
    await expectFailure(
      executeRoleChange("target", "user", "requester", dependencies(repository, auth)),
      "MIGRATION_REQUIRED"
    );
    auth.claims = { role: "organizer", admin: true };
    await expectFailure(
      executeRoleChange("target", "user", "requester", dependencies(repository, auth)),
      "MANUAL_REVIEW_REQUIRED"
    );
    expect(repository.exists).to.equal(false);
  });

  it("não inicializa legado após lookup falhar e permite nova descoberta", async () => {
    const repository = new FakeRepository();
    repository.exists = false;
    const auth = new FakeAuth();
    auth.failGet = true;
    await expectFailure(
      executeRoleChange("target", "user", "requester", dependencies(repository, auth)),
      "AUTH_USER_NOT_FOUND"
    );
    expect(repository.exists).to.equal(false);
    expect(repository.operationCount).to.equal(0);
    expect(repository.trace).to.deep.equal(["reserve"]);

    auth.failGet = false;
    auth.claims = { role: "admin", admin: true };
    await expectFailure(
      executeRoleChange("target", "user", "requester", dependencies(repository, auth)),
      "MIGRATION_REQUIRED"
    );
    expect(repository.exists).to.equal(false);
    expect(repository.operationCount).to.equal(0);

    auth.claims = { role: "user" };
    const result = await executeRoleChange(
      "target",
      "user",
      "requester",
      dependencies(repository, auth)
    );
    expect(result.roleVersion).to.equal(1);
    expect(repository.exists).to.equal(true);
    expect(repository.operationCount).to.equal(1);
  });

  it("usa código estável para falha de lookup que não é user-not-found", async () => {
    const repository = new FakeRepository();
    repository.exists = false;
    const auth = new FakeAuth();
    auth.failGet = true;
    auth.getErrorCode = "auth/internal-error";
    await expectFailure(
      executeRoleChange("target", "user", "requester", dependencies(repository, auth)),
      "AUTH_LOOKUP_FAILED"
    );
    expect(repository.exists).to.equal(false);
    expect(repository.operationCount).to.equal(0);
  });

  it("promove, rebaixa e preserva claims não relacionadas", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    const promoted = await executeRoleChange(
      "target",
      "admin",
      "requester",
      dependencies(repository, auth)
    );
    expect(promoted.roleVersion).to.equal(2);
    expect(repository.role).to.equal("admin");
    expect(auth.claims).to.include({
      role: "admin",
      admin: true,
      roleVersion: 2,
      featureFlag: "keep",
    });

    await executeRoleChange(
      "target",
      "user",
      "requester",
      dependencies(repository, auth)
    );
    expect(repository.role).to.equal("user");
    expect(repository.roleVersion).to.equal(3);
    expect(auth.claims.admin).to.equal(false);
  });

  it("fica fail-closed imediatamente após a reserva", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    auth.failSet = true;
    await expectFailure(
      executeRoleChange("target", "admin", "requester", dependencies(repository, auth)),
      ROLE_CHANGE_ERROR_CODES.setClaims
    );
    expect(repository.status).to.equal("error");
    expect(repository.roleVersion).to.equal(2);
  });

  it("preserva o código original quando markFailed também falha", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    repository.failMarkFailed = true;
    auth.failSet = true;
    await expectFailure(
      executeRoleChange(
        "target", "admin", "requester", dependencies(repository, auth)
      ),
      ROLE_CHANGE_ERROR_CODES.setClaims
    );
  });

  it("invalida autorização existente quando o usuário Auth não existe", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    auth.failGet = true;
    await expectFailure(
      executeRoleChange("target", "admin", "requester", dependencies(repository, auth)),
      ROLE_CHANGE_ERROR_CODES.authUserNotFound
    );
    expect(repository.status).to.equal("error");
    expect(repository.roleVersion).to.equal(2);
  });

  it("retoma após falha de claims sem incrementar novamente", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    auth.failSet = true;
    await expectFailure(
      executeRoleChange("target", "admin", "requester", dependencies(repository, auth)),
      ROLE_CHANGE_ERROR_CODES.setClaims
    );
    auth.failSet = false;
    await executeRoleChange("target", "admin", "other-admin", dependencies(repository, auth));
    expect(repository.roleVersion).to.equal(2);
    expect(repository.attempts).to.equal(2);
    expect(repository.role).to.equal("admin");
  });

  it("retoma após falha de revoke e finalização", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    auth.failRevoke = true;
    await expectFailure(
      executeRoleChange("target", "organizer", "requester", dependencies(repository, auth)),
      ROLE_CHANGE_ERROR_CODES.revoke
    );
    auth.failRevoke = false;
    repository.failFinalize = true;
    await expectFailure(
      executeRoleChange("target", "organizer", "requester", dependencies(repository, auth)),
      ROLE_CHANGE_ERROR_CODES.finalize
    );
    repository.failFinalize = false;
    await executeRoleChange("target", "organizer", "requester", dependencies(repository, auth));
    expect(repository.role).to.equal("organizer");
    expect(repository.roleVersion).to.equal(2);
  });

  it("segunda solicitação para role ativa retorna sem tocar no Auth", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    await executeRoleChange("target", "validator", "requester", dependencies(repository, auth));
    const setCalls = auth.setCalls;
    const revokeCalls = auth.revokeCalls;
    const getCalls = auth.getCalls;
    const operationCount = repository.operationCount;
    const result = await executeRoleChange(
      "target",
      "validator",
      "requester",
      dependencies(repository, auth)
    );
    expect(result.resumed).to.equal(true);
    expect(repository.roleVersion).to.equal(2);
    expect(repository.operationCount).to.equal(operationCount);
    expect(auth.getCalls).to.equal(getCalls);
    expect(auth.setCalls).to.equal(setCalls);
    expect(auth.revokeCalls).to.equal(revokeCalls);
  });

  it("rejeita mudança incompatível concorrente", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    auth.failSet = true;
    await expectFailure(
      executeRoleChange("target", "admin", "requester", dependencies(repository, auth)),
      ROLE_CHANGE_ERROR_CODES.setClaims
    );
    await expectFailure(
      executeRoleChange("target", "validator", "requester", dependencies(repository, auth)),
      "ROLE_CHANGE_CONFLICT"
    );
  });
});
