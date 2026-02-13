import { initializeApp, getApps } from "firebase/app";
import { getAuth, connectAuthEmulator } from "firebase/auth";
import { getFirestore, connectFirestoreEmulator } from "firebase/firestore";
import { getStorage, connectStorageEmulator } from "firebase/storage";
import { getFunctions, connectFunctionsEmulator } from "firebase/functions";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID,
};

let app;
if (!getApps().length) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);
const functions = getFunctions(app, "southamerica-east1");
const analytics = getAnalytics(app);

// Conectar aos emuladores em desenvolvimento
if (import.meta.env.DEV) {
  // Pointing to the functions emulator
  connectFunctionsEmulator(functions, "127.0.0.1", 5001);
  
  // Pointing to the auth emulator
  connectAuthEmulator(auth, "http://127.0.0.1:9099");

  // Pointing to the firestore emulator
  connectFirestoreEmulator(db, "127.0.0.1", 8085);
  
  // Pointing to the storage emulator
  connectStorageEmulator(storage, "127.0.0.1", 9199);
}

export { app, auth, db, storage, functions, analytics, firebaseConfig };
