import { expect } from "chai";
import { HttpsError } from "firebase-functions/v2/https";
import { RoleChangeFailure } from "../../lib/auth/roleChange.js";
import {
  assertNotSelfRoleChange,
  mapRoleChangeFailure,
  parseRoleChangePayload,
  roleChangeCodeFromError,
} from "../../lib/endpoints/users.js";

describe("role endpoint", () => {
  it("rejeita autoalteração de administrador", () => {
    expect(() => assertNotSelfRoleChange("admin-a", "admin-a"))
      .to.throw(HttpsError)
      .with.property("code", "failed-precondition");
  });

  it("permite selecionar outro usuário", () => {
    expect(() => assertNotSelfRoleChange("admin-a", "user-b")).not.to.throw();
  });

  it("setUserRole rejeita admin", () => {
    expect(() => parseRoleChangePayload({ uid: "user-b", role: "admin" }))
      .to.throw(HttpsError)
      .with.property("code", "invalid-argument");
  });

  it("setAdminRole continua aceitando promoção para admin", () => {
    expect(parseRoleChangePayload({ uid: "user-b" }, "admin"))
      .to.deep.equal({ uid: "user-b", role: "admin" });
  });

  for (const uid of [42, {}, [], ""]) {
    it(`rejeita UID inválido ${JSON.stringify(uid)}`, () => {
      expect(() => parseRoleChangePayload({ uid, role: "user" }))
        .to.throw(HttpsError)
        .with.property("code", "invalid-argument");
    });
  }

  it("continua aceitando UID string válido", () => {
    expect(parseRoleChangePayload({ uid: "user-b", role: "user" }))
      .to.deep.equal({ uid: "user-b", role: "user" });
  });

  for (const role of ["user", "organizer", "validator"] as const) {
    it(`setUserRole continua aceitando ${role}`, () => {
      expect(parseRoleChangePayload({ uid: "user-b", role }))
        .to.deep.equal({ uid: "user-b", role });
    });
  }

  for (const testCase of [
    ["ROLE_CHANGE_CONFLICT", "aborted"],
    ["MIGRATION_REQUIRED", "failed-precondition"],
    ["MANUAL_REVIEW_REQUIRED", "failed-precondition"],
    ["AUTHORIZATION_INVALID", "internal"],
    ["AUTH_SET_CLAIMS_FAILED", "internal"],
    ["AUTH_REVOKE_FAILED", "internal"],
  ] as const) {
    it(`preserva ${testCase[0]} no HttpsError`, () => {
      const mapped = mapRoleChangeFailure(
        new RoleChangeFailure(testCase[0], "failure")
      );
      expect(mapped.code).to.equal(testCase[1]);
      expect(mapped.details).to.deep.equal({ roleChangeCode: testCase[0] });
      expect(roleChangeCodeFromError(mapped)).to.equal(testCase[0]);
    });
  }
});
