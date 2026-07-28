import { expect } from "chai";
import { planLegacyActiveMigration } from "../../lib/auth/roleMigration.js";

describe("role migration planning", () => {
  it("mantém legacy active coerente sem tocar no Auth", () => {
    expect(planLegacyActiveMigration(
      { status: "active", role: "admin", roleVersion: 4 },
      { role: "admin", admin: true, roleVersion: 4 },
      "admin",
      false
    )).to.deep.equal({ kind: "complete-active", touchAuth: false });
  });

  it("envia legacy active incoerente ao fluxo fail-closed", () => {
    expect(planLegacyActiveMigration(
      { status: "active", role: "admin", roleVersion: 4 },
      { role: "admin", admin: true, roleVersion: 3 },
      "admin",
      false
    )).to.deep.equal({ kind: "apply-claims", touchAuth: true });
  });
});
