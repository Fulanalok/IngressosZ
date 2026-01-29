import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

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
// @ts-expect-error
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
export const storage = (() => {
  try {
    return getStorage(app);
  } catch (err) {
    console.warn("Firebase Storage init failed (ignorar em testes):", err);
    return {} as any;
  }
})();
// Firebase Functions client não é utilizado atualmente; evite carregá-lo para reduzir bundle
// export const functions = getFunctions(app);

const shouldTryEmulators = import.meta.env.VITE_USE_EMULATORS === "true";
if (shouldTryEmulators) {
  // Forçar 127.0.0.1 para evitar problemas de resolução de DNS (localhost vs IPv6)
  const host = "127.0.0.1";

  // Conectar imediatamente aos emuladores para evitar que o SDK tente bater na produção
  // (O que causa erros 400/404 se a chave de API não for válida para prod ou se o usuário não existir lá)
  connectAuthEmulator(auth, `http://${host}:9099`, {
    disableWarnings: true,
  });
  connectFirestoreEmulator(db, host, 8080);
  // @ts-ignore
  if (storage._app) {
    // Verificação simples se o storage foi inicializado
    try {
      connectStorageEmulator(storage, host, 9199);
    } catch (e) {
      console.warn("Falha ao conectar emulador storage", e);
    }
  }

  console.log(
    "🔥 Configurado para usar emuladores (Auth: 9099, Firestore: 8080, Storage: 9199)"
  );
}
