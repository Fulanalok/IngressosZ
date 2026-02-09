/// <reference types="vite/client" />
/// <reference types="@testing-library/jest-dom" />

interface ImportMetaEnv {
  readonly VITE_FIREBASE_API_KEY: string;
  readonly VITE_FIREBASE_AUTH_DOMAIN: string;
  readonly VITE_FIREBASE_PROJECT_ID: string;
  readonly VITE_FIREBASE_STORAGE_BUCKET: string;
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID: string;
  readonly VITE_FIREBASE_APP_ID: string;
  readonly VITE_FIREBASE_MEASUREMENT_ID: string;
  readonly VITE_USE_EMULATORS?: string;
  readonly VITE_SENTRY_DSN?: string;
  readonly VITE_FUNCTIONS_PORT?: string;
  readonly VITE_FIREBASE_EMULATOR_AUTH_PORT: string;
  readonly VITE_FIREBASE_EMULATOR_FIRESTORE_PORT: string;
  readonly VITE_FIREBASE_EMULATOR_FUNCTIONS_PORT: string;
  readonly VITE_FIREBASE_EMULATOR_STORAGE_PORT: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

