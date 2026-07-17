import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  orderBy,
  query,
  setDoc,
  Timestamp,
  updateDoc,
  where,
} from "firebase/firestore";
import { readFileSync } from "fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

const createdAt = Timestamp.fromDate(new Date("2026-01-01T10:00:00Z"));

function eventData(organizerId: string) {
  return {
    title: `Evento ${organizerId}`,
    description: "Descricao",
    date: "2026-08-01",
    time: "20:00",
    location: "Local",
    address: "Endereco",
    price: 100,
    maxTickets: 100,
    availableTickets: 100,
    soldTickets: 0,
    category: "Musica",
    organizerId,
    createdBy: organizerId,
    createdAt,
    updatedAt: createdAt,
  };
}

async function seed(path: string, data: Record<string, unknown>) {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), path), data);
  });
}

describe("autorizacao do Firestore", () => {
  beforeAll(async () => {
    const emulatorHost = process.env.FIRESTORE_EMULATOR_HOST;
    if (!emulatorHost) {
      throw new Error(
        "FIRESTORE_EMULATOR_HOST ausente. Execute os testes com npm run test:rules na raiz."
      );
    }
    const [host, port] = emulatorHost.split(":");
    testEnv = await initializeTestEnvironment({
      projectId: "zingressos-rules-test",
      firestore: {
        rules: readFileSync("../firestore.rules", "utf8"),
        host,
        port: Number(port),
      },
    });
  });

  afterAll(async () => testEnv?.cleanup());
  beforeEach(async () => testEnv.clearFirestore());

  it("permite leitura publica de eventos por usuario anonimo", async () => {
    await seed("events/public-event", eventData("org-a"));
    const anonymous = testEnv.unauthenticatedContext();

    await assertSucceeds(
      getDoc(doc(anonymous.firestore(), "events/public-event"))
    );
    await assertSucceeds(
      getDocs(collection(anonymous.firestore(), "events"))
    );
  });

  it("permite usuario comum ler eventos", async () => {
    await seed("events/public-event", eventData("org-a"));
    const user = testEnv.authenticatedContext("user-a", { role: "user" });

    await assertSucceeds(
      getDoc(doc(user.firestore(), "events/public-event"))
    );
  });

  it("bloqueia anonimo ao criar, editar ou excluir evento", async () => {
    await seed("events/public-event", eventData("org-a"));
    const anonymous = testEnv.unauthenticatedContext();

    await assertFails(
      setDoc(
        doc(anonymous.firestore(), "events/new-event"),
        eventData("anonymous")
      )
    );
    await assertFails(
      updateDoc(doc(anonymous.firestore(), "events/public-event"), {
        title: "Tentativa",
      })
    );
    await assertFails(
      deleteDoc(doc(anonymous.firestore(), "events/public-event"))
    );
  });

  it("bloqueia usuario comum ao criar evento", async () => {
    await seed("events/public-event", eventData("org-a"));
    const user = testEnv.authenticatedContext("user-a", { role: "user" });
    await assertFails(
      setDoc(doc(user.firestore(), "events/event-user"), eventData("user-a"))
    );
    await assertFails(
      updateDoc(doc(user.firestore(), "events/public-event"), {
        title: "Tentativa",
      })
    );
    await assertFails(
      deleteDoc(doc(user.firestore(), "events/public-event"))
    );
  });

  it("permite organizer criar apenas evento proprio", async () => {
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });
    await assertSucceeds(
      setDoc(doc(organizer.firestore(), "events/event-a"), eventData("org-a"))
    );
    await assertFails(
      setDoc(doc(organizer.firestore(), "events/event-b"), {
        ...eventData("org-b"),
        createdBy: "org-a",
      })
    );
  });

  it("isola edicao e exclusao entre organizers", async () => {
    await seed("events/event-a", eventData("org-a"));
    await seed("events/event-b", eventData("org-b"));
    const organizerA = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });

    await assertSucceeds(getDoc(doc(organizerA.firestore(), "events/event-a")));
    await assertSucceeds(
      getDocs(
        query(
          collection(organizerA.firestore(), "events"),
          where("organizerId", "==", "org-a"),
          orderBy("date", "desc")
        )
      )
    );
    await assertSucceeds(getDoc(doc(organizerA.firestore(), "events/event-b")));
    await assertFails(
      updateDoc(doc(organizerA.firestore(), "events/event-b"), {
        title: "Tentativa",
      })
    );
    await assertFails(deleteDoc(doc(organizerA.firestore(), "events/event-b")));
  });

  it("isola tickets e participantes de outros organizers", async () => {
    await seed("events/event-a", eventData("org-a"));
    await seed("events/event-b", eventData("org-b"));
    await seed("tickets/ticket-b", {
      eventId: "event-b",
      userId: "buyer-b",
    });
    await seed("events/event-b/participants/buyer-b", { userId: "buyer-b" });
    const organizerA = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });

    await assertFails(getDoc(doc(organizerA.firestore(), "tickets/ticket-b")));
    await assertFails(
      getDoc(
        doc(
          organizerA.firestore(),
          "events/event-b/participants/buyer-b"
        )
      )
    );
  });

  it("permite organizer ler tickets somente do proprio evento", async () => {
    await seed("events/event-a", eventData("org-a"));
    await seed("tickets/ticket-a", {
      eventId: "event-a",
      userId: "buyer-a",
      purchaseDate: createdAt,
    });
    const organizerA = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });
    await assertSucceeds(getDoc(doc(organizerA.firestore(), "tickets/ticket-a")));
    await assertSucceeds(
      getDocs(
        query(
          collection(organizerA.firestore(), "tickets"),
          where("eventId", "==", "event-a"),
          orderBy("purchaseDate", "desc")
        )
      )
    );
  });

  it("permite organizer consultar vendas somente do proprio evento", async () => {
    await seed("events/event-a", eventData("org-a"));
    await seed("paymentSessions/payment-a", {
      eventId: "event-a",
      userId: "buyer-a",
      status: "approved",
      createdAt,
    });
    const organizerA = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });
    await assertSucceeds(
      getDocs(
        query(
          collection(organizerA.firestore(), "paymentSessions"),
          where("eventId", "==", "event-a"),
          where("status", "==", "approved"),
          orderBy("createdAt", "desc")
        )
      )
    );
  });

  it("permite validator ler somente a propria atribuicao ativa", async () => {
    await seed("events/event-a", eventData("org-a"));
    await seed("events/event-a/validators/validator-a", {
      userId: "validator-a",
      assignedAt: createdAt,
      assignedBy: "admin-a",
      active: true,
    });
    const assigned = testEnv.authenticatedContext("validator-a", {
      role: "validator",
    });
    const unassigned = testEnv.authenticatedContext("validator-b", {
      role: "validator",
    });

    await assertSucceeds(
      getDoc(
        doc(assigned.firestore(), "events/event-a/validators/validator-a")
      )
    );
    await assertFails(
      getDoc(
        doc(unassigned.firestore(), "events/event-a/validators/validator-b")
      )
    );
    await assertSucceeds(getDoc(doc(assigned.firestore(), "events/event-a")));
  });

  it("bloqueia alteracao direta de role por user e organizer", async () => {
    await seed("users/user-a", {
      uid: "user-a",
      email: "user@example.com",
      role: "user",
      createdAt,
    });
    const user = testEnv.authenticatedContext("user-a", { role: "user" });
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });

    await assertFails(
      updateDoc(doc(user.firestore(), "users/user-a"), { role: "admin" })
    );
    await assertFails(
      updateDoc(doc(organizer.firestore(), "users/user-a"), {
        role: "organizer",
      })
    );
  });

  it("impede trocar organizerId e createdBy apos a criacao", async () => {
    await seed("events/event-a", eventData("org-a"));
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });
    await assertFails(
      updateDoc(doc(organizer.firestore(), "events/event-a"), {
        organizerId: "org-b",
      })
    );
    await assertFails(
      updateDoc(doc(organizer.firestore(), "events/event-a"), {
        createdBy: "org-b",
      })
    );
  });

  it("bloqueia escrita direta em estoque e campos financeiros", async () => {
    await seed("events/event-a", eventData("org-a"));
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });
    const eventRef = doc(organizer.firestore(), "events/event-a");

    for (const update of [
      { availableTickets: 90 },
      { soldTickets: 10 },
      { price: 1 },
      { pricing: { standard: 1 } },
      { inventory: { standard: 1 } },
      { maxTickets: 1 },
    ]) {
      await assertFails(updateDoc(eventRef, update));
    }
  });

  it("permite admin administrar eventos e atribuicoes de validators", async () => {
    await seed("events/event-a", eventData("org-a"));
    const admin = testEnv.authenticatedContext("admin-a", {
      role: "admin",
      admin: true,
    });
    await assertSucceeds(getDoc(doc(admin.firestore(), "events/event-a")));
    await assertSucceeds(
      updateDoc(doc(admin.firestore(), "events/event-a"), { title: "Atualizado" })
    );
    await assertSucceeds(
      setDoc(doc(admin.firestore(), "events/event-a/validators/validator-a"), {
        userId: "validator-a",
        assignedAt: createdAt,
        assignedBy: "admin-a",
        active: true,
      })
    );
  });

  it("permite usuario ler somente o proprio ticket e perfil", async () => {
    await seed("tickets/ticket-a", { userId: "user-a", eventId: "event-a" });
    await seed("tickets/ticket-b", { userId: "user-b", eventId: "event-b" });
    await seed("users/user-a", { uid: "user-a", role: "user", createdAt });
    await seed("users/user-b", { uid: "user-b", role: "user", createdAt });
    const user = testEnv.authenticatedContext("user-a", { role: "user" });

    await assertSucceeds(getDoc(doc(user.firestore(), "tickets/ticket-a")));
    await assertFails(getDoc(doc(user.firestore(), "tickets/ticket-b")));
    await assertSucceeds(getDoc(doc(user.firestore(), "users/user-a")));
    await assertFails(getDoc(doc(user.firestore(), "users/user-b")));
  });
});
