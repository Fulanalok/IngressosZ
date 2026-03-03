import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";
const firebaseConfig = {
  apiKey: "REDACTED_FIREBASE_API_KEY",
  authDomain: "<your-project>.firebaseapp.com",
  projectId: "<your-firebase-project-id>",
  storageBucket: "<your-project>.firebasestorage.app",
  messagingSenderId: "849448511679",
  appId: "1:849448511679:web:033c7d8892c37fd86ebe0a"
};
let app;
if (!getApps().length) {
    app = initializeApp(firebaseConfig);
}
else {
    app = getApps()[0];
}
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functionsRegion = import.meta.env.VITE_FUNCTIONS_REGION ||
    "southamerica-east1";
const functions = getFunctions(app, functionsRegion);
const useEmulators = import.meta.env.DEV &&
    String(import.meta.env.VITE_USE_EMULATORS ?? "false").toLowerCase() ===
        "true";
let analytics = null;
if (!useEmulators && import.meta.env.PROD && firebaseConfig.measurementId) {
    analytics = getAnalytics(app);
}
// Conectar aos emuladores em desenvolvimento
if (useEmulators) {
    const fnPort = Number(import.meta.env.VITE_FUNCTIONS_PORT ??
        import.meta.env.VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT ??
        "5001");
    const authPort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_AUTH_PORT ?? "9099");
    const firestorePort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_FIRESTORE_PORT ?? "8086");
    const storagePort = Number(import.meta.env.VITE_FIREBASE_EMULATOR_STORAGE_PORT ?? "9199");
    connectFunctionsEmulator(functions, "127.0.0.1", fnPort);
    connectAuthEmulator(auth, `http://127.0.0.1:${authPort}`);
    connectFirestoreEmulator(db, "127.0.0.1", firestorePort);
    connectStorageEmulator(storage, "127.0.0.1", storagePort);
}
export { app, auth, db, storage, functions, analytics, firebaseConfig };
