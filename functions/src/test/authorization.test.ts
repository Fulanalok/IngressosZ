import { expect } from "chai";
import { HttpsError } from "firebase-functions/v2/https";
import {
  authorizeIdentity,
  canValidateEvent,
  claimRole,
  claimRoleVersion,
  type AuthorizationReader,
  type AuthorizedIdentity,
  type EventAuthorizationReader,
} from "../../lib/auth/authorization.js";

function authorization(data: Record<string, unknown> | null): AuthorizationReader {
  return { async getAuthorization() { return data; } };
}

function identity(
  token: Record<string, unknown> = {
    role: "admin",
    admin: true,
    roleVersion: 3,
  }
) {
  return { uid: "user-a", token };
}

async function expectDenied(
  token: Record<string, unknown>,
  data: Record<string, unknown> | null
) {
  let caught: unknown;
  try {
    await authorizeIdentity(identity(token), ["admin", "organizer"], authorization(data));
  } catch (error) {
    caught = error;
  }
  expect(caught).to.be.instanceOf(HttpsError);
  expect((caught as HttpsError).code).to.equal("permission-denied");
}

function eventReader(
  organizerId: string,
  assignments: Record<string, boolean> = {}
): EventAuthorizationReader {
  return {
    async getEvent() { return { organizerId }; },
    async getValidatorAssignment(_eventId, userId) {
      return userId in assignments ? { userId, active: assignments[userId] } : null;
    },
  };
}

describe("authorization", () => {
  it("aceita somente roles canônicas e versões inteiras positivas", () => {
    for (const role of ["user", "organizer", "validator", "admin"]) {
      expect(claimRole({ role })).to.equal(role);
    }
    for (const role of ["Admin", "unknown", 1]) {
      expect(claimRole({ role })).to.equal(null);
    }
    for (const value of [undefined, 0, -1, 1.5, "1"]) {
      expect(claimRoleVersion({ roleVersion: value })).to.equal(null);
    }
    expect(claimRoleVersion({ roleVersion: 1 })).to.equal(1);
  });

  it("autoriza token atual coerente", async () => {
    const result = await authorizeIdentity(
      identity(),
      ["admin"],
      authorization({ role: "admin", roleVersion: 3, status: "active" })
    );
    expect(result.role).to.equal("admin");
    expect(result.roleVersion).to.equal(3);
  });

  it("nega documento ausente, versão ausente, antiga e futura", async () => {
    await expectDenied(identity().token, null);
    await expectDenied(
      { role: "admin", admin: true },
      { role: "admin", roleVersion: 3, status: "active" }
    );
    await expectDenied(
      { role: "admin", admin: true, roleVersion: 2 },
      { role: "admin", roleVersion: 3, status: "active" }
    );
    await expectDenied(
      { role: "admin", admin: true, roleVersion: 4 },
      { role: "admin", roleVersion: 3, status: "active" }
    );
  });

  it("nega applying, error, role divergente e admin contraditório", async () => {
    for (const status of ["applying", "error"]) {
      await expectDenied(
        identity().token,
        { role: "admin", roleVersion: 3, status }
      );
    }
    await expectDenied(
      identity().token,
      { role: "organizer", roleVersion: 3, status: "active" }
    );
    await expectDenied(
      { role: "admin", roleVersion: 3 },
      { role: "admin", roleVersion: 3, status: "active" }
    );
    await expectDenied(
      { role: "organizer", admin: true, roleVersion: 3 },
      { role: "organizer", roleVersion: 3, status: "active" }
    );
  });

  it("canValidateEvent opera com identidade previamente validada", async () => {
    const organizer: AuthorizedIdentity = {
      uid: "org-a",
      token: { role: "organizer", roleVersion: 1 },
      role: "organizer",
      roleVersion: 1,
    };
    const validator: AuthorizedIdentity = {
      uid: "validator-a",
      token: { role: "validator", roleVersion: 1 },
      role: "validator",
      roleVersion: 1,
    };
    expect(await canValidateEvent(organizer, "event-a", eventReader("org-a")))
      .to.equal(true);
    expect(await canValidateEvent(organizer, "event-b", eventReader("org-b")))
      .to.equal(false);
    expect(await canValidateEvent(
      validator,
      "event-a",
      eventReader("org-a", { "validator-a": true })
    )).to.equal(true);
  });
});
