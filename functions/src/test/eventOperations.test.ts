import { expect } from "chai";
import { HttpsError } from "firebase-functions/v2/https";
import type {
  EventOperationsDependencies,
  EventOperationsRepository,
} from "../../lib/endpoints/eventOperations.js";
import {
  executeCreateEvent,
  executeDeleteEvent,
  executeUpdateEvent,
} from "../../lib/endpoints/eventOperations.js";

class FakeRepository implements EventOperationsRepository {
  events = new Map<string, Record<string, unknown>>();
  created?: Record<string, unknown>;
  updated?: { eventId: string; data: Record<string, unknown> };
  deleted?: string;
  updateAuthorizedCalls = 0;
  deleteAuthorizedCalls = 0;

  async create(data: Record<string, unknown>) {
    this.created = data;
    this.events.set("new-event", data);
    return "new-event";
  }
  async updateAuthorized(
    eventId: string,
    uid: string,
    isAdmin: boolean,
    data: Record<string, unknown>
  ) {
    this.updateAuthorizedCalls += 1;
    const event = this.events.get(eventId);
    if (!event) throw new HttpsError("not-found", "Evento nao encontrado.");
    if (!isAdmin && event.organizerId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "O evento pertence a outro organizador."
      );
    }
    this.updated = { eventId, data };
  }
  async deleteAuthorized(eventId: string, uid: string, isAdmin: boolean) {
    this.deleteAuthorizedCalls += 1;
    const event = this.events.get(eventId);
    if (!event) throw new HttpsError("not-found", "Evento nao encontrado.");
    if (!isAdmin && event.organizerId !== uid) {
      throw new HttpsError(
        "permission-denied",
        "O evento pertence a outro organizador."
      );
    }
    this.deleted = eventId;
  }
}

const validEvent = {
  title: "Evento",
  description: "Descricao",
  date: "2026-12-01",
  time: "20:00",
  location: "Local",
  address: "Endereco",
  category: "Musica",
  price: 100,
  maxTickets: 50,
};

function request(role: string, data: unknown, uid = `${role}-a`) {
  return { auth: { uid, token: { role, admin: role === "admin" } }, data };
}

function dependencies(repository: FakeRepository): EventOperationsDependencies {
  return { repository, timestamp: () => "server-time" };
}

async function expectCode(promise: Promise<unknown>, code: string) {
  try {
    await promise;
    expect.fail(`Esperava erro ${code}`);
  } catch (error) {
    expect((error as { code?: string }).code).to.equal(code);
  }
}

describe("operacoes administrativas de eventos", () => {
  it("exige autenticacao", async () => {
    await expectCode(
      executeCreateEvent(
        { data: validEvent },
        dependencies(new FakeRepository())
      ),
      "unauthenticated"
    );
  });

  it("admin cria evento para qualquer organizer com identidade do backend", async () => {
    const repository = new FakeRepository();
    const result = await executeCreateEvent(
      request("admin", { ...validEvent, organizerId: "org-b" }),
      dependencies(repository)
    );
    expect(result.eventId).to.equal("new-event");
    expect(repository.created).to.include({
      organizerId: "org-b",
      createdBy: "admin-a",
      availableTickets: 50,
      createdAt: "server-time",
      updatedAt: "server-time",
    });
  });

  it("organizer cria evento proprio", async () => {
    const repository = new FakeRepository();
    await executeCreateEvent(
      request("organizer", validEvent, "org-a"),
      dependencies(repository)
    );
    expect(repository.created).to.include({ organizerId: "org-a", createdBy: "org-a" });
  });

  it("admin edita e exclui qualquer evento", async () => {
    const repository = new FakeRepository();
    repository.events.set("event-b", { organizerId: "org-b" });
    await executeUpdateEvent(
      request("admin", { eventId: "event-b", changes: { title: "Novo" } }),
      dependencies(repository)
    );
    await executeDeleteEvent(
      request("admin", { eventId: "event-b" }),
      dependencies(repository)
    );
    expect(repository.updated?.data).to.deep.equal({ title: "Novo", updatedAt: "server-time" });
    expect(repository.deleted).to.equal("event-b");
    expect(repository.updateAuthorizedCalls).to.equal(1);
    expect(repository.deleteAuthorizedCalls).to.equal(1);
  });

  it("organizer edita e exclui somente evento proprio", async () => {
    const repository = new FakeRepository();
    repository.events.set("own", { organizerId: "org-a" });
    repository.events.set("other", { organizerId: "org-b" });
    await executeUpdateEvent(
      request("organizer", { eventId: "own", changes: { location: "Novo" } }, "org-a"),
      dependencies(repository)
    );
    await executeDeleteEvent(
      request("organizer", { eventId: "own" }, "org-a"),
      dependencies(repository)
    );
    expect(repository.updateAuthorizedCalls).to.equal(1);
    expect(repository.deleteAuthorizedCalls).to.equal(1);
    await expectCode(
      executeUpdateEvent(
        request("organizer", { eventId: "other", changes: { title: "Nao" } }, "org-a"),
        dependencies(repository)
      ),
      "permission-denied"
    );
    await expectCode(
      executeDeleteEvent(request("organizer", { eventId: "other" }, "org-a"), dependencies(repository)),
      "permission-denied"
    );
  });

  it("delega ownership e mutacao sem get separado", async () => {
    const repository = new FakeRepository();
    repository.events.set("own", { organizerId: "org-a" });
    expect("get" in repository).to.equal(false);

    await executeUpdateEvent(
      request(
        "organizer",
        { eventId: "own", changes: { title: "Atomico" } },
        "org-a"
      ),
      dependencies(repository)
    );
    await executeDeleteEvent(
      request("organizer", { eventId: "own" }, "org-a"),
      dependencies(repository)
    );

    expect(repository.updateAuthorizedCalls).to.equal(1);
    expect(repository.deleteAuthorizedCalls).to.equal(1);
  });

  it("organizer nao define organizerId", async () => {
    await expectCode(
      executeCreateEvent(
        request("organizer", { ...validEvent, organizerId: "org-b" }, "org-a"),
        dependencies(new FakeRepository())
      ),
      "permission-denied"
    );
  });

  it("valida inventory inteiro com soma igual a maxTickets", async () => {
    const repository = new FakeRepository();
    await executeCreateEvent(
      request("admin", {
        ...validEvent,
        maxTickets: 50,
        inventory: { standard: 30, vip: 15, premium: 5 },
      }),
      dependencies(repository)
    );
    expect(repository.created?.inventory).to.deep.equal({
      standard: 30,
      vip: 15,
      premium: 5,
    });
    expect(repository.created?.availableTickets).to.equal(50);
  });

  it("bloqueia inventory fracionario, NaN e Infinity", async () => {
    for (const invalid of [1.5, Number.NaN, Number.POSITIVE_INFINITY]) {
      await expectCode(
        executeCreateEvent(
          request("admin", {
            ...validEvent,
            inventory: { standard: invalid, vip: 49, premium: 0 },
          }),
          dependencies(new FakeRepository())
        ),
        "invalid-argument"
      );
    }
  });

  it("bloqueia inventory cuja soma difere de maxTickets", async () => {
    await expectCode(
      executeCreateEvent(
        request("admin", {
          ...validEvent,
          inventory: { standard: 40, vip: 0, premium: 0 },
        }),
        dependencies(new FakeRepository())
      ),
      "invalid-argument"
    );
  });

  it("trata inventory todo zero como nao configurado", async () => {
    const repository = new FakeRepository();
    await executeCreateEvent(
      request("admin", {
        ...validEvent,
        inventory: { standard: 0, vip: 0, premium: 0 },
      }),
      dependencies(repository)
    );
    expect(repository.created).not.to.have.property("inventory");
    expect(repository.created?.availableTickets).to.equal(50);
  });

  it("aceita pricing decimal finito", async () => {
    const repository = new FakeRepository();
    await executeCreateEvent(
      request("admin", {
        ...validEvent,
        pricing: { standard: 10.5, vip: 20.75, premium: 0 },
      }),
      dependencies(repository)
    );
    expect(repository.created?.pricing).to.deep.equal({
      standard: 10.5,
      vip: 20.75,
      premium: 0,
    });
  });

  it("bloqueia maxPerPurchase maior que maxTickets", async () => {
    await expectCode(
      executeCreateEvent(
        request("admin", { ...validEvent, maxPerPurchase: 51 }),
        dependencies(new FakeRepository())
      ),
      "invalid-argument"
    );
  });

  it("rejeita alteracoes de identidade, timestamps, estoque e valores", async () => {
    const protectedFields = [
      "organizerId", "createdBy", "createdAt", "availableTickets", "soldTickets",
      "inventory", "pricing", "price", "maxTickets", "revenue",
    ];
    for (const field of protectedFields) {
      const repository = new FakeRepository();
      repository.events.set("own", { organizerId: "org-a" });
      await expectCode(
        executeUpdateEvent(
          request("organizer", { eventId: "own", changes: { [field]: 1 } }, "org-a"),
          dependencies(repository)
        ),
        "invalid-argument"
      );
      expect(repository.updated).to.equal(undefined);
    }
  });

  it("bloqueia strings obrigatorias vazias ou somente com espacos", async () => {
    for (const value of ["", "   "]) {
      for (const field of [
        "title", "description", "date", "time", "location", "address",
        "category",
      ]) {
        const repository = new FakeRepository();
        repository.events.set("own", { organizerId: "org-a" });
        await expectCode(
          executeUpdateEvent(
            request(
              "organizer",
              { eventId: "own", changes: { [field]: value } },
              "org-a"
            ),
            dependencies(repository)
          ),
          "invalid-argument"
        );
        expect(repository.updateAuthorizedCalls).to.equal(0);
      }
    }
  });

  it("aceita atualizacao valida e image vazia", async () => {
    const repository = new FakeRepository();
    repository.events.set("own", { organizerId: "org-a" });
    await executeUpdateEvent(
      request(
        "organizer",
        { eventId: "own", changes: { title: "Evento novo", image: "" } },
        "org-a"
      ),
      dependencies(repository)
    );
    expect(repository.updated?.data).to.deep.equal({
      title: "Evento novo",
      image: "",
      updatedAt: "server-time",
    });
  });

  it("user e validator nao gerenciam eventos", async () => {
    for (const role of ["user", "validator"]) {
      await expectCode(
        executeCreateEvent(request(role, validEvent), dependencies(new FakeRepository())),
        "permission-denied"
      );
      await expectCode(
        executeUpdateEvent(
          request(role, { eventId: "event", changes: { title: "Novo" } }),
          dependencies(new FakeRepository())
        ),
        "permission-denied"
      );
      await expectCode(
        executeDeleteEvent(request(role, { eventId: "event" }), dependencies(new FakeRepository())),
        "permission-denied"
      );
    }
  });

  it("rejeita payloads null, undefined, primitivo e array", async () => {
    for (const payload of [null, undefined, "evento", []]) {
      await expectCode(
        executeCreateEvent(request("admin", payload), dependencies(new FakeRepository())),
        "invalid-argument"
      );
      await expectCode(
        executeUpdateEvent(request("admin", payload), dependencies(new FakeRepository())),
        "invalid-argument"
      );
      await expectCode(
        executeDeleteEvent(request("admin", payload), dependencies(new FakeRepository())),
        "invalid-argument"
      );
    }
  });

  it("retorna not-found para evento inexistente", async () => {
    const repository = new FakeRepository();
    await expectCode(
      executeUpdateEvent(
        request("admin", { eventId: "missing", changes: { title: "Novo" } }),
        dependencies(repository)
      ),
      "not-found"
    );
    await expectCode(
      executeDeleteEvent(request("admin", { eventId: "missing" }), dependencies(repository)),
      "not-found"
    );
  });
});
