
import { 
  assertFails, 
  assertSucceeds, 
  initializeTestEnvironment, 
  RulesTestEnvironment 
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { readFileSync } from 'fs';

let testEnv: RulesTestEnvironment;

// Função para carregar as regras de um arquivo
const getRules = () => {
  return readFileSync('../firestore.rules', 'utf8');
};

describe("Regras de segurança do Firestore para Ingressos", () => {
  beforeAll(async () => {
    testEnv = await initializeTestEnvironment({
      projectId: "zingressos-test",
      firestore: { rules: getRules() },
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
      await setDoc(doc(context.firestore(), "tickets/ticket_da_alice"), { ownerId: alice.uid });
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
      await setDoc(doc(context.firestore(), "tickets/ticket_da_alice"), { ownerId: alice.uid });
    });

    // Bob tentando ler o ingresso da Alice
    const ref = doc(bobContext.firestore(), "tickets/ticket_da_alice");
    await assertFails(getDoc(ref));
  });
});
