import { expect } from "chai";
import { HttpsError } from "firebase-functions/v2/https";
import { authorizeEventValidatorChange } from "../../lib/endpoints/eventAccess.js";

const adminAuth = {
  uid: "admin-a",
  token: { role: "admin", admin: true },
};

async function expectHttpsError(
  promise: Promise<unknown>,
  code: HttpsError["code"]
) {
  try {
    await promise;
    expect.fail("Era esperado um HttpsError");
  } catch (error) {
    expect(error).to.be.instanceOf(HttpsError);
    expect((error as HttpsError).code).to.equal(code);
  }
}

describe("event validator access", () => {
  it("exige role validator ao ativar", async () => {
    let checkedRole: string | null = null;
    const result = await authorizeEventValidatorChange(
      {
        auth: adminAuth,
        data: { eventId: "event-a", userId: "validator-a", active: true },
      },
      async (_userId, role) => {
        checkedRole = role;
      }
    );

    expect(checkedRole).to.equal("validator");
    expect(result).to.deep.equal({
      eventId: "event-a",
      userId: "validator-a",
      active: true,
    });
  });

  it("permite desativar sem consultar a role atual", async () => {
    let roleCheckCalled = false;
    const result = await authorizeEventValidatorChange(
      {
        auth: adminAuth,
        data: { eventId: "event-a", userId: "removed-user", active: false },
      },
      async () => {
        roleCheckCalled = true;
        throw new Error("Usuário removido do Auth");
      }
    );

    expect(roleCheckCalled).to.equal(false);
    expect(result.active).to.equal(false);
  });

  it("bloqueia usuario nao admin", async () => {
    await expectHttpsError(
      authorizeEventValidatorChange(
        {
          auth: { uid: "user-a", token: { role: "user" } },
          data: { eventId: "event-a", userId: "validator-a", active: false },
        },
        async () => undefined
      ),
      "permission-denied"
    );
  });
});
