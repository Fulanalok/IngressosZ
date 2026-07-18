import { expect } from "chai";
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

  async create(data: Record<string, unknown>) {
    this.created = data;
    this.events.set("new-event", data);
    return "new-event";
  }
  async get(eventId: string) {
    return this.events.get(eventId) ?? null;
  }
  async update(eventId: string, data: Record<string, unknown>) {
    this.updated = { eventId, data };
  }
  async delete(eventId: string) {
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

  it("organizer nao define organizerId", async () => {
    await expectCode(
      executeCreateEvent(
        request("organizer", { ...validEvent, organizerId: "org-b" }, "org-a"),
        dependencies(new FakeRepository())
      ),
      "permission-denied"
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
