import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc } from "firebase/firestore";
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
});
