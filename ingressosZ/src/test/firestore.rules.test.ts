import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc, Timestamp } from "firebase/firestore";
import { readFileSync } from "fs";
import { afterAll, beforeAll, beforeEach, describe, it } from "vitest";

let testEnv: RulesTestEnvironment;

const getRules = () => readFileSync("../firestore.rules", "utf8");
const getFirestorePort = () => {
  try {
    const config = JSON.parse(readFileSync("../firebase.json", "utf8"));
    return config?.emulators?.firestore?.port ?? 8080;
  } catch {
    return 8080;
  }
};
const getFirestoreConfig = () => {
  const envHost = process.env.FIRESTORE_EMULATOR_HOST;
  if (envHost) {
    const [host, port] = envHost.split(":");
    return { host: host || "127.0.0.1", port: Number(port) || 8080 };
  }
  return { host: "127.0.0.1", port: getFirestorePort() };
};
const describeEmulator = process.env.FIRESTORE_EMULATOR_HOST
  ? describe
  : describe.skip;

describeEmulator("Regras de segurança do Firestore para Ingressos", () => {
  beforeAll(async () => {
    const { host, port } = getFirestoreConfig();
    testEnv = await initializeTestEnvironment({
      projectId: "zingressos-test",
      firestore: {
        rules: getRules(),
        host,
        port,
      },
    });
  });

  afterAll(async () => {
    if (testEnv) {
      await testEnv.cleanup();
    }
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  const baseEventData = {
    title: "Evento Teste",
    description: "Descricao",
    date: "2025-01-01",
    time: "20:00",
    location: "Local",
    address: "Endereco",
    price: 100,
    maxTickets: 100,
    availableTickets: 100,
    category: "Musica",
    organizerId: "alice",
    createdBy: "alice",
    createdAt: Timestamp.fromDate(new Date("2025-01-01T10:00:00Z")),
    updatedAt: Timestamp.fromDate(new Date("2025-01-01T10:00:00Z")),
  };

  it("deve PERMITIR que um usuário leia seu próprio ingresso", async () => {
    const alice = { uid: "alice" };
    const aliceContext = testEnv.authenticatedContext(alice.uid);

    // Adicionar um ingresso para a Alice no backend
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "tickets/ticket_da_alice"), {
        userId: alice.uid,
      });
    });

    // Tentar ler como Alice
    const ref = doc(aliceContext.firestore(), "tickets/ticket_da_alice");
    await assertSucceeds(getDoc(ref));
  });

  it("deve BLOQUEAR a leitura do ingresso de outro usuário", async () => {
    const alice = { uid: "alice" };
    const bob = { uid: "bob" };
    const bobContext = testEnv.authenticatedContext(bob.uid);

    // Adicionar um ingresso para a Alice no backend
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "tickets/ticket_da_alice"), {
        userId: alice.uid,
      });
    });

    // Bob tentando ler o ingresso da Alice
    const ref = doc(bobContext.firestore(), "tickets/ticket_da_alice");
    await assertFails(getDoc(ref));
  });

  it("deve PERMITIR criação de evento com dados válidos", async () => {
    const aliceContext = testEnv.authenticatedContext("alice");
    const ref = doc(aliceContext.firestore(), "events/evento_1");
    await assertSucceeds(setDoc(ref, baseEventData));
  });

  it("deve BLOQUEAR criação de evento com campos extras", async () => {
    const aliceContext = testEnv.authenticatedContext("alice");
    const ref = doc(aliceContext.firestore(), "events/evento_2");
    await assertFails(
      setDoc(ref, { ...baseEventData, extraField: "nao permitido" })
    );
  });

  it("deve PERMITIR update de campos não sensíveis pelo criador", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "events/evento_3"), baseEventData);
    });
    const aliceContext = testEnv.authenticatedContext("alice");
    await assertSucceeds(
      updateDoc(doc(aliceContext.firestore(), "events/evento_3"), {
        title: "Novo titulo",
      })
    );
  });

  it("deve BLOQUEAR update de estoque por usuário sem role", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "events/evento_4"), baseEventData);
    });
    const aliceContext = testEnv.authenticatedContext("alice");
    await assertFails(
      updateDoc(doc(aliceContext.firestore(), "events/evento_4"), {
        availableTickets: 50,
      })
    );
  });

  it("deve PERMITIR update de estoque por organizer", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "events/evento_5"), baseEventData);
    });
    const organizerContext = testEnv.authenticatedContext("org1", {
      role: "organizer",
    });
    await assertSucceeds(
      updateDoc(doc(organizerContext.firestore(), "events/evento_5"), {
        availableTickets: 90,
      })
    );
  });

  it("deve PERMITIR criação de paymentSession válida", async () => {
    const aliceContext = testEnv.authenticatedContext("alice", {
      email: "alice@example.com",
    });
    const ref = doc(aliceContext.firestore(), "paymentSessions/sessao_1");
    await assertSucceeds(
      setDoc(ref, {
        eventId: "evento_1",
        userId: "alice",
        userEmail: "alice@example.com",
        ticketType: "standard",
        quantity: 2,
        unitPrice: 50,
        totalAmount: 100,
        status: "pending",
        provider: "mercadopago",
        createdAt: Timestamp.fromDate(new Date("2025-01-01T10:00:00Z")),
      })
    );
  });

  it("deve BLOQUEAR criação de paymentSession inválida", async () => {
    const aliceContext = testEnv.authenticatedContext("alice", {
      email: "alice@example.com",
    });
    const ref = doc(aliceContext.firestore(), "paymentSessions/sessao_2");
    await assertFails(
      setDoc(ref, {
        eventId: "evento_1",
        userId: "alice",
        userEmail: "alice@example.com",
        ticketType: "standard",
        quantity: 2,
        unitPrice: 50,
        totalAmount: 999,
        status: "pending",
        provider: "mercadopago",
        createdAt: Timestamp.fromDate(new Date("2025-01-01T10:00:00Z")),
      })
    );
  });

  it("deve BLOQUEAR leitura e escrita em purchases", async () => {
    const aliceContext = testEnv.authenticatedContext("alice");
    const ref = doc(aliceContext.firestore(), "purchases/purchase_1");
    await assertFails(setDoc(ref, { userId: "alice" }));
    await assertFails(getDoc(ref));
  });

  it("deve PERMITIR criação de perfil do usuário válido", async () => {
    const aliceContext = testEnv.authenticatedContext("alice", {
      email: "alice@example.com",
      role: "user",
    });
    const ref = doc(aliceContext.firestore(), "users/alice");
    await assertSucceeds(
      setDoc(ref, {
        uid: "alice",
        email: "alice@example.com",
        displayName: "Alice",
        phone: "11999999999",
        createdAt: Timestamp.fromDate(new Date("2025-01-01T10:00:00Z")),
        role: "user",
        avatarUrl: "",
      })
    );
  });

  it("deve BLOQUEAR update de role do usuário sem claim", async () => {
    await testEnv.withSecurityRulesDisabled(async (context) => {
      await setDoc(doc(context.firestore(), "users/alice"), {
        uid: "alice",
        email: "alice@example.com",
        displayName: "Alice",
        phone: "11999999999",
        createdAt: Timestamp.fromDate(new Date("2025-01-01T10:00:00Z")),
        role: "user",
        avatarUrl: "",
      });
    });
    const aliceContext = testEnv.authenticatedContext("alice", {
      email: "alice@example.com",
      role: "user",
    });
    await assertFails(
      updateDoc(doc(aliceContext.firestore(), "users/alice"), {
        role: "admin",
      })
    );
  });
});
