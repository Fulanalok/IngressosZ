import { initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
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
