import { expect } from "chai";
import { HttpsError } from "firebase-functions/v2/https";
import { assertNotSelfRoleChange } from "../../lib/endpoints/users.js";

describe("role endpoint", () => {
  it("rejeita autoalteração de administrador", () => {
    expect(() => assertNotSelfRoleChange("admin-a", "admin-a"))
      .to.throw(HttpsError)
      .with.property("code", "failed-precondition");
  });

  it("permite selecionar outro usuário", () => {
    expect(() => assertNotSelfRoleChange("admin-a", "user-b")).not.to.throw();
  });
});
