import { expect } from "chai";
import {
  canValidateEvent,
  isAdminClaims,
  type EventAuthorizationReader,
} from "../../lib/auth/authorization.js";

function reader(
  organizerId: string,
  assignments: Record<string, boolean> = {}
): EventAuthorizationReader {
  return {
    async getEvent() {
      return { organizerId };
    },
    async getValidatorAssignment(_eventId, userId) {
      return userId in assignments
        ? { userId, active: assignments[userId] }
        : null;
    },
  };
}

describe("authorization", () => {
  it("permite somente admin autorizar alteracoes de roles", () => {
    expect(isAdminClaims({ admin: true })).to.equal(true);
    expect(isAdminClaims({ role: "admin" })).to.equal(true);
    expect(isAdminClaims({ role: "organizer" })).to.equal(false);
    expect(isAdminClaims({ role: "user" })).to.equal(false);
  });

  it("permite validator atribuido validar o evento correspondente", async () => {
    const allowed = await canValidateEvent(
      { uid: "validator-a", token: { role: "validator" } },
      "event-a",
      reader("org-a", { "validator-a": true })
    );
    expect(allowed).to.equal(true);
  });

  it("bloqueia validator nao atribuido ou inativo", async () => {
    const unassigned = await canValidateEvent(
      { uid: "validator-b", token: { role: "validator" } },
      "event-a",
      reader("org-a", { "validator-a": true })
    );
    const inactive = await canValidateEvent(
      { uid: "validator-a", token: { role: "validator" } },
      "event-a",
      reader("org-a", { "validator-a": false })
    );
    expect(unassigned).to.equal(false);
    expect(inactive).to.equal(false);
  });

  it("permite organizer validar somente o proprio evento", async () => {
    const own = await canValidateEvent(
      { uid: "org-a", token: { role: "organizer" } },
      "event-a",
      reader("org-a")
    );
    const other = await canValidateEvent(
      { uid: "org-a", token: { role: "organizer" } },
      "event-b",
      reader("org-b")
    );
    expect(own).to.equal(true);
    expect(other).to.equal(false);
  });

  it("bloqueia usuario comum mesmo com perfil externo privilegiado", async () => {
    const allowed = await canValidateEvent(
      { uid: "user-a", token: { role: "user" } },
      "event-a",
      reader("user-a", { "user-a": true })
    );
    expect(allowed).to.equal(false);
  });
});
