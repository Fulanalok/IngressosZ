import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  type RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from "fs";

let testEnv: RulesTestEnvironment;

// Função para carregar as regras de um arquivo
const getRules = () => {
  return readFileSync("../firestore.rules", "utf8");
};

describe.skip("Regras de segurança do Firestore para Ingressos", () => {
  beforeAll(async () => {
    // Configura o host/porta explicitamente para garantir que conecte no emulador rodando
    process.env.FIRESTORE_EMULATOR_HOST = "127.0.0.1:8080";

    testEnv = await initializeTestEnvironment({
      projectId: "zingressos-test",
      firestore: {
        rules: getRules(),
        host: "127.0.0.1",
        port: 8080,
      },
    });
  });

  afterAll(async () => {
    await testEnv.cleanup();
  });

  beforeEach(async () => {
    await testEnv.clearFirestore();
  });

  it("deve PERMITIR que um usuário leia seu próprio ingresso", async () => {
    const alice = { uid: "alice" };
    const aliceContext = testEnv.authenticatedContext(alice.uid);

    // Adicionar um ingresso para a Alice no backend
    await testEnv.withSecurityRulesDisabled(async (context) => {
      // Importante: usar 'userId' em vez de 'ownerId' para bater com as regras do firestore.rules
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
      // Importante: usar 'userId' em vez de 'ownerId' para bater com as regras do firestore.rules
      await setDoc(doc(context.firestore(), "tickets/ticket_da_alice"), {
        userId: alice.uid,
      });
    });

    // Bob tentando ler o ingresso da Alice
    const ref = doc(bobContext.firestore(), "tickets/ticket_da_alice");
    await assertFails(getDoc(ref));
  });
});
