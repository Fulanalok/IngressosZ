import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from "firebase/functions";
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from "firebase/storage";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

// Validação leve para garantir configuração correta (apenas chaves essenciais)
const requiredKeys = ["apiKey", "authDomain", "projectId", "appId"] as const;
const missingKeys = requiredKeys.filter((k) => !firebaseConfig[k]);

if (missingKeys.length) {
  const message = `Firebase config incompleta. Faltam: ${missingKeys.join(
    ", "
  )}`;
  if (import.meta.env.PROD) {
    throw new Error(message);
  } else {
    console.warn(message);
  }
}

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);

// Inicializa Storage com tratamento de erro
export const storage: FirebaseStorage | null = (() => {
  try {
    return getStorage(app);
  } catch (err) {
    console.warn("Firebase Storage init failed (ignorar em testes):", err);
    return null;
  }
})();

// Inicializa Functions com tratamento de erro
export const functions: Functions | null = (() => {
  try {
    return getFunctions(app);
  } catch (err) {
    console.warn("Firebase Functions init failed (ignorar em testes):", err);
    return null;
  }
})();

const shouldTryEmulators = import.meta.env.VITE_USE_EMULATORS === "true";
if (shouldTryEmulators) {
  // Forçar 127.0.0.1 para evitar problemas de resolução de DNS (localhost vs IPv6)
  const host = "127.0.0.1";

  // Helper para parsear portas com fallback
  const parsePort = (val: string | undefined, fallback: number): number => {
    const parsed = parseInt(val || "", 10);
    return isNaN(parsed) ? fallback : parsed;
  };

  // Portas configuráveis via .env
  const authPort = parsePort(
    import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_PORT,
    9099
  );
  const firestorePort = parsePort(
    import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT,
    8085
  );
  const functionsPort = parsePort(
    import.meta.env.VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT,
    5001
  );
  const storagePort = parsePort(
    import.meta.env.VITE_FIREBASE_EMULATOR_STORAGE_PORT,
    9199
  );

  // Conectar imediatamente aos emuladores para evitar que o SDK tente bater na produção
  // (O que causa erros 400/404 se a chave de API não for válida para prod ou se o usuário não existir lá)
  connectAuthEmulator(auth, `http://${host}:${authPort}`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, host, firestorePort);

  if (storage) {
    try {
      connectStorageEmulator(storage, host, storagePort);
    } catch (e) {
      console.warn("Falha ao conectar emulador storage", e);
    }
  }

  if (functions) {
    try {
      connectFunctionsEmulator(functions, host, functionsPort);
    } catch (e) {
      console.warn("Falha ao conectar emulador functions", e);
    }
  }

  console.log(
    `🔥 Configurado para usar emuladores (Auth: ${authPort}, Firestore: ${firestorePort}, Storage: ${storagePort}, Functions: ${functionsPort})`
  );
}
