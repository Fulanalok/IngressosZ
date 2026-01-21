import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
// import { getFunctions, connectFunctionsEmulator } from "firebase/functions";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "mock-api-key",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "mock-auth-domain",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "mock-project-id",
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "mock-storage-bucket",
  messagingSenderId:
    import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "mock-app-id",
  measurementId:
    import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-MOCKMEASURE",
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
export const storage = getStorage(app);
// Firebase Functions client não é utilizado atualmente; evite carregá-lo para reduzir bundle
// export const functions = getFunctions(app);

const shouldTryEmulators =
  import.meta.env.VITE_USE_EMULATORS === "true" || import.meta.env.DEV;
if (shouldTryEmulators) {
  void (async () => {
    const host =
      typeof window !== "undefined" && window.location?.hostname
        ? window.location.hostname
        : "127.0.0.1";
    const ping = async (url: string) => {
      try {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), 700);
        await fetch(url, { mode: "no-cors", signal: controller.signal });
        clearTimeout(id);
        return true;
      } catch {
        return false;
      }
    };
    if (await ping(`http://${host}:9099`)) {
      try {
        connectAuthEmulator(auth, `http://${host}:9099`, {
          disableWarnings: true,
        });
      } catch {
        void 0;
      }
    }
    // Conexão com emulador Firestore desabilitada para reduzir bundle e compatibilizar com versão lite
    // Cliente Functions desabilitado para reduzir bundle
  })();
}
