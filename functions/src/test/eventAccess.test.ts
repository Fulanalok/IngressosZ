import { expect } from "chai";
import { HttpsError } from "firebase-functions/v2/https";
import {
  authorizeEventValidatorChange,
  requirePayloadObject,
} from "../../lib/endpoints/eventAccess.js";

const adminAuth = {
  uid: "admin-a",
  token: { role: "admin", admin: true, roleVersion: 1 },
};

const currentAdmin = {
  async getAuthorization() {
    return { role: "admin", roleVersion: 1, status: "active" };
  },
};

async function expectHttpsError(
  promise: Promise<unknown>,
  code: HttpsError["code"],
  message?: string
) {
  try {
    await promise;
    expect.fail("Era esperado um HttpsError");
  } catch (error) {
    expect(error).to.be.instanceOf(HttpsError);
    expect((error as HttpsError).code).to.equal(code);
    if (message) expect((error as HttpsError).message).to.equal(message);
  }
}

describe("event validator access", () => {
  for (const [label, data] of [
    ["null", null],
    ["undefined", undefined],
    ["primitivo", "payload"],
    ["array", []],
  ] as const) {
    it(`rejeita payload ${label}`, async () => {
      const promise = authorizeEventValidatorChange(
        { auth: adminAuth, data },
        async () => undefined,
        currentAdmin
      );

      await expectHttpsError(
        promise,
        "invalid-argument",
        "Payload inválido."
      );
    });
  }

  it("aceita payload valido de organizer", () => {
    const payload = { eventId: "event-a", organizerId: "organizer-a" };
    expect(requirePayloadObject(payload)).to.equal(payload);
  });

  it("exige role validator ao ativar", async () => {
    let checkedRole: string | null = null;
    const result = await authorizeEventValidatorChange(
      {
        auth: adminAuth,
        data: { eventId: "event-a", userId: "validator-a", active: true },
      },
      async (_userId, role) => {
        checkedRole = role;
      },
      currentAdmin
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
      },
      currentAdmin
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
        async () => undefined,
        {
          async getAuthorization() {
            return { role: "user", roleVersion: 1, status: "active" };
          },
        }
      ),
      "permission-denied"
    );
  });
});
