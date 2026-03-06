import { getApps, initializeApp } from "firebase/app";
import { connectAuthEmulator, getAuth } from "firebase/auth";
import { connectFirestoreEmulator, getFirestore } from "firebase/firestore";
import { connectFunctionsEmulator, getFunctions } from "firebase/functions";
import { connectStorageEmulator, getStorage } from "firebase/storage";
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "",
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
const functionsRegion = import.meta.env.VITE_FUNCTIONS_REGION || "southamerica-east1";
const functions = getFunctions(app, functionsRegion);
const useEmulators = import.meta.env.DEV &&
    String(import.meta.env.VITE_USE_EMULATORS ?? "false").toLowerCase() ===
        "true";
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
export { app, auth, db, firebaseConfig, functions, storage };
