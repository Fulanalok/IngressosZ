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

  it("bloqueia organizer ao criar evento diretamente", async () => {
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });
    await assertFails(
      setDoc(doc(organizer.firestore(), "events/event-a"), eventData("org-a"))
    );
    await assertFails(
      setDoc(doc(organizer.firestore(), "events/event-b"), {
        ...eventData("org-b"),
        createdBy: "org-a",
      })
    );
  });

  it("bloqueia criacao direta mesmo com capacidade inicial valida", async () => {
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });

    await assertFails(
      setDoc(doc(organizer.firestore(), "events/valid-event"), eventData("org-a"))
    );
  });

  it("bloqueia maxTickets fracionario na criacao", async () => {
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });

    await assertFails(
      setDoc(doc(organizer.firestore(), "events/fractional-max"), {
        ...eventData("org-a"),
        maxTickets: 100.5,
        availableTickets: 100.5,
      })
    );
  });

  it("bloqueia availableTickets fracionario na criacao", async () => {
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });

    await assertFails(
      setDoc(doc(organizer.firestore(), "events/fractional-available"), {
        ...eventData("org-a"),
        maxTickets: 100,
        availableTickets: 99.5,
      })
    );
  });

  it("bloqueia soldTickets positivo na criacao", async () => {
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });

    await assertFails(
      setDoc(doc(organizer.firestore(), "events/sold-event"), {
        ...eventData("org-a"),
        soldTickets: 1,
      })
    );
  });

  it("bloqueia estoque disponivel diferente da capacidade na criacao", async () => {
    const organizer = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });

    await assertFails(
      setDoc(doc(organizer.firestore(), "events/mismatched-stock"), {
        ...eventData("org-a"),
        availableTickets: 99,
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
      updateDoc(doc(organizerA.firestore(), "events/event-a"), {
        title: "Tentativa no proprio evento",
      })
    );
    await assertFails(deleteDoc(doc(organizerA.firestore(), "events/event-a")));
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
    await seed("events/event-b", eventData("org-b"));
    await seed("tickets/ticket-a", {
      eventId: "event-a",
      userId: "buyer-a",
      purchaseDate: createdAt,
    });
    await seed("tickets/ticket-b", {
      eventId: "event-b",
      userId: "buyer-b",
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
    await assertFails(
      getDocs(collection(organizerA.firestore(), "tickets"))
    );
    await assertFails(
      getDocs(
        query(
          collection(organizerA.firestore(), "tickets"),
          where("eventId", "==", "event-b")
        )
      )
    );
  });

  it("permite organizer consultar vendas somente do proprio evento", async () => {
    await seed("events/event-a", eventData("org-a"));
    await seed("events/event-b", eventData("org-b"));
    await seed("paymentSessions/payment-a", {
      eventId: "event-a",
      userId: "buyer-a",
      status: "approved",
      createdAt,
    });
    await seed("paymentSessions/payment-b", {
      eventId: "event-b",
      userId: "buyer-b",
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
    await assertFails(
      getDocs(collection(organizerA.firestore(), "paymentSessions"))
    );
    await assertFails(
      getDocs(
        query(
          collection(organizerA.firestore(), "paymentSessions"),
          where("eventId", "==", "event-b")
        )
      )
    );
  });

  it("bloqueia escrita cliente em paymentSessions", async () => {
    await seed("paymentSessions/session-a", {
      eventId: "event-a",
      userId: "user-a",
      status: "pending",
      createdAt,
    });
    const user = testEnv.authenticatedContext("user-a", { role: "user" });
    const sessionRef = doc(user.firestore(), "paymentSessions/session-a");
    await assertFails(
      setDoc(doc(user.firestore(), "paymentSessions/new-session"), {
        eventId: "event-a",
        userId: "user-a",
        status: "pending",
        createdAt,
      })
    );
    await assertFails(updateDoc(sessionRef, { providerState: "created" }));
    await assertFails(deleteDoc(sessionRef));
  });

  it("usuario comum le somente as proprias paymentSessions", async () => {
    await seed("paymentSessions/session-a", {
      eventId: "event-a",
      userId: "user-a",
      status: "pending",
      providerState: "ready",
      createdAt,
    });
    await seed("paymentSessions/session-b", {
      eventId: "event-b",
      userId: "user-b",
      status: "pending",
      providerState: "ready",
      createdAt,
    });
    const user = testEnv.authenticatedContext("user-a", { role: "user" });
    await assertSucceeds(
      getDoc(doc(user.firestore(), "paymentSessions/session-a"))
    );
    await assertFails(
      getDoc(doc(user.firestore(), "paymentSessions/session-b"))
    );
  });

  it("organizer le paymentSessions somente do proprio evento", async () => {
    await seed("events/event-a", eventData("org-a"));
    await seed("events/event-b", eventData("org-b"));
    await seed("paymentSessions/session-a", {
      eventId: "event-a",
      userId: "buyer-a",
      status: "pending",
      providerState: "ready",
      createdAt,
    });
    const owner = testEnv.authenticatedContext("org-a", {
      role: "organizer",
    });
    const otherOrganizer = testEnv.authenticatedContext("org-b", {
      role: "organizer",
    });
    await assertSucceeds(
      getDoc(doc(owner.firestore(), "paymentSessions/session-a"))
    );
    await assertFails(
      getDoc(doc(otherOrganizer.firestore(), "paymentSessions/session-a"))
    );
  });

  it("admin preserva leitura de paymentSessions", async () => {
    await seed("paymentSessions/session-a", {
      eventId: "event-a",
      userId: "user-a",
      status: "pending",
      createdAt,
    });
    const admin = testEnv.authenticatedContext("admin-a", {
      role: "admin",
      admin: true,
    });
    await assertSucceeds(
      getDoc(doc(admin.firestore(), "paymentSessions/session-a"))
    );
  });

  it("Admin SDK administra paymentSessions fora das Rules", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const sessionRef = doc(
        context.firestore(),
        "paymentSessions/trusted-session"
      );
      await setDoc(sessionRef, {
        eventId: "event-a",
        userId: "user-a",
        status: "pending",
        createdAt,
      });
      await updateDoc(sessionRef, { providerState: "created" });
      await deleteDoc(sessionRef);
    });
  });

  it("cria perfil com email igual ao token", async () => {
    const user = testEnv.authenticatedContext("user-email", {
      role: "user",
      email: "user@example.com",
    });
    await assertSucceeds(
      setDoc(doc(user.firestore(), "users/user-email"), {
        uid: "user-email",
        email: "user@example.com",
        role: "user",
        createdAt,
      })
    );
  });

  it("rejeita perfil com email diferente do token", async () => {
    const user = testEnv.authenticatedContext("user-email", {
      role: "user",
      email: "token@example.com",
    });
    await assertFails(
      setDoc(doc(user.firestore(), "users/user-email"), {
        uid: "user-email",
        email: "other@example.com",
        role: "user",
        createdAt,
      })
    );
  });

  it("cria perfil valido sem o campo opcional email", async () => {
    const user = testEnv.authenticatedContext("user-no-email", {
      role: "user",
      email: "token@example.com",
    });
    await assertSucceeds(
      setDoc(doc(user.firestore(), "users/user-no-email"), {
        uid: "user-no-email",
        role: "user",
        createdAt,
      })
    );
  });

  it("restringe validator a propria atribuicao ativa", async () => {
    await seed("events/event-a", eventData("org-a"));
    await seed("tickets/ticket-a", {
      eventId: "event-a",
      userId: "buyer-a",
    });
    await seed("events/event-a/participants/buyer-a", {
      userId: "buyer-a",
    });
    await seed("events/event-a/validators/validator-a", {
      userId: "validator-a",
      assignedAt: createdAt,
      assignedBy: "admin-a",
      active: true,
    });
    await seed("events/event-a/validators/validator-inactive", {
      userId: "validator-inactive",
      assignedAt: createdAt,
      assignedBy: "admin-a",
      active: false,
    });
    const assigned = testEnv.authenticatedContext("validator-a", {
      role: "validator",
    });
    const unassigned = testEnv.authenticatedContext("validator-b", {
      role: "validator",
    });
    const inactive = testEnv.authenticatedContext("validator-inactive", {
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
    await assertFails(
      getDoc(
        doc(
          inactive.firestore(),
          "events/event-a/validators/validator-inactive"
        )
      )
    );
    await assertFails(getDoc(doc(assigned.firestore(), "tickets/ticket-a")));
    await assertFails(
      getDoc(
        doc(assigned.firestore(), "events/event-a/participants/buyer-a")
      )
    );
  });

  it("valida criacao de purchasedTickets contra o ticket de origem", async () => {
    await seed("tickets/ticket-a", {
      eventId: "event-a",
      userId: "user-a",
    });
    await seed("tickets/ticket-b", {
      eventId: "event-b",
      userId: "user-b",
    });
    await seed("tickets/ticket-c", {
      eventId: "event-a",
      userId: "user-a",
    });
    const user = testEnv.authenticatedContext("user-a", { role: "user" });
    const purchasedTickets = collection(
      user.firestore(),
      "users/user-a/purchasedTickets"
    );
    const validData = {
      ticketId: "ticket-a",
      eventId: "event-a",
      purchaseDate: createdAt,
    };

    await assertSucceeds(setDoc(doc(purchasedTickets, "ticket-a"), validData));
    await assertFails(
      setDoc(doc(purchasedTickets, "different-id"), validData)
    );
    await assertFails(
      setDoc(doc(purchasedTickets, "ticket-c"), {
        ...validData,
        ticketId: "ticket-c",
        eventId: "event-b",
      })
    );
    await assertFails(
      setDoc(doc(purchasedTickets, "ticket-b"), {
        ticketId: "ticket-b",
        eventId: "event-b",
        purchaseDate: createdAt,
      })
    );
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

  it("bloqueia escritas diretas de admin e preserva leitura", async () => {
    await seed("events/event-a", eventData("org-a"));
    const admin = testEnv.authenticatedContext("admin-a", {
      role: "admin",
      admin: true,
    });
    await assertSucceeds(getDoc(doc(admin.firestore(), "events/event-a")));
    await assertFails(
      setDoc(doc(admin.firestore(), "events/admin-created"), eventData("admin-a"))
    );
    await assertFails(
      updateDoc(doc(admin.firestore(), "events/event-a"), { title: "Atualizado" })
    );
    await assertFails(deleteDoc(doc(admin.firestore(), "events/event-a")));
    await assertFails(
      setDoc(doc(admin.firestore(), "events/event-a/validators/validator-a"), {
        userId: "validator-a",
        assignedAt: createdAt,
        assignedBy: "admin-a",
        active: true,
      })
    );
  });

  it("permite ao Admin SDK administrar eventos fora das Rules", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      const eventRef = doc(context.firestore(), "events/trusted-event");
      await setDoc(eventRef, eventData("org-a"));
      await updateDoc(eventRef, { title: "Atualizado pelo backend" });
      await deleteDoc(eventRef);
    });
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
