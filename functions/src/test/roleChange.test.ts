import { expect } from "chai";
import {
  executeRoleChange,
  ROLE_CHANGE_ERROR_CODES,
  RoleChangeFailure,
  type RoleAuthGateway,
  type RoleChangeRepository,
  type RoleReservation,
} from "../../lib/auth/roleChange.js";
import type { AuthClaims, UserRole } from "../../lib/auth/authorization.js";

class FakeRepository implements RoleChangeRepository {
  role: UserRole = "user";
  roleVersion = 1;
  status: "active" | "applying" | "error" = "active";
  desiredRole: UserRole | null = null;
  operationId: string | null = null;
  attempts = 0;
  failFinalize = false;

  async reserve(input: {
    targetUid: string;
    desiredRole: UserRole;
    requestedBy: string;
    operationId: string;
    legacyRole: UserRole | null;
    force?: boolean;
  }): Promise<RoleReservation> {
    if (this.status !== "active") {
      if (this.desiredRole !== input.desiredRole) {
        throw new RoleChangeFailure("ROLE_CHANGE_CONFLICT", "conflict");
      }
      this.status = "applying";
      this.attempts += 1;
      return this.reservation(input.targetUid);
    }
    if (this.role === input.desiredRole && !input.force) {
      return { ...this.reservation(input.targetUid), completed: true };
    }
    this.roleVersion += 1;
    this.status = "applying";
    this.desiredRole = input.desiredRole;
    this.operationId = input.operationId;
    this.attempts += 1;
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
  setCalls = 0;
  revokeCalls = 0;

  async getClaims() {
    if (this.failGet) throw new Error("missing");
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
  try {
    await promise;
    expect.fail("Era esperada falha.");
  } catch (error) {
    expect(error).to.be.instanceOf(RoleChangeFailure);
    expect((error as RoleChangeFailure).code).to.equal(code);
  }
}

describe("role change orchestration", () => {
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

  it("invalida autorização existente quando o usuário Auth não existe", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    auth.failGet = true;
    await expectFailure(
      executeRoleChange("target", "user", "requester", dependencies(repository, auth)),
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

  it("retry depois do sucesso é idempotente", async () => {
    const repository = new FakeRepository();
    const auth = new FakeAuth();
    await executeRoleChange("target", "validator", "requester", dependencies(repository, auth));
    const setCalls = auth.setCalls;
    const result = await executeRoleChange(
      "target",
      "validator",
      "requester",
      dependencies(repository, auth)
    );
    expect(result.resumed).to.equal(true);
    expect(repository.roleVersion).to.equal(2);
    expect(auth.setCalls).to.equal(setCalls);
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
