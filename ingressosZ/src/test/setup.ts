import "@testing-library/jest-dom/vitest";
import React from "react";
import { vi } from "vitest";

Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: (query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: () => {},
    removeListener: () => {},
    addEventListener: () => {},
    removeEventListener: () => {},
    dispatchEvent: () => false,
  }),
});

class MockIntersectionObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(window, "IntersectionObserver", {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});

// jsdom pode não implementar scrollTo; define fallback quando ausente
Object.defineProperty(window, "scrollTo", {
  writable: true,
  configurable: true,
  value: vi.fn(),
});

// Mock global do Firebase para evitar erros de inicialização com config vazia
vi.mock("firebase/app", () => ({
  FirebaseError: class extends Error {
    code: string;
    constructor(code: string, message: string) {
      super(message);
      this.code = code;
      this.name = "FirebaseError";
    }
  },
  initializeApp: vi.fn(() => ({})),
  getApps: vi.fn(() => []),
}));

vi.mock("firebase/auth", async () => {
  const actual = await vi.importActual<typeof import("firebase/auth")>(
    "firebase/auth"
  );
  return {
    ...actual,
    getAuth: vi.fn(() => ({
      currentUser: null,
      onAuthStateChanged: vi.fn(),
    })),
    connectAuthEmulator: vi.fn(),
    GoogleAuthProvider: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signInWithEmailAndPassword: vi.fn(),
    sendPasswordResetEmail: vi.fn(),
    signInAnonymously: vi.fn(),
  };
});

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>(
    "firebase/firestore"
  );
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    connectFirestoreEmulator: vi.fn(),
  };
});

vi.mock("firebase/storage", async () => {
  const actual = await vi.importActual<typeof import("firebase/storage")>(
    "firebase/storage"
  );
  return {
    ...actual,
    getStorage: vi.fn(() => ({})),
    connectStorageEmulator: vi.fn(),
  };
});

vi.mock("firebase/functions", async () => {
  const actual = await vi.importActual<typeof import("firebase/functions")>(
    "firebase/functions"
  );
  return {
    ...actual,
    getFunctions: vi.fn(() => ({})),
    connectFunctionsEmulator: vi.fn(),
    httpsCallable: () => async () => ({ data: { success: true } }),
  };
});

vi.mock("firebase/app-check", () => ({
  initializeAppCheck: vi.fn(() => ({})),
  ReCaptchaEnterpriseProvider: vi.fn(),
  getToken: vi.fn(async () => ({ token: "test-app-check-token" })),
}));

vi.mock("firebase/analytics", async () => {
  const actual = await vi.importActual<typeof import("firebase/analytics")>(
    "firebase/analytics"
  );
  return {
    ...actual,
    getAnalytics: vi.fn(() => ({})),
  };
});

vi.mock("react-google-recaptcha", () => {
  const RecaptchaMock = ({
    onChange,
  }: {
    onChange?: (token: string | null) => void;
  }) => {
    const didCallRef = React.useRef(false);
    React.useLayoutEffect(() => {
      if (didCallRef.current) return;
      didCallRef.current = true;
      onChange?.("test-recaptcha-token");
    }, [onChange]);
    return React.createElement("div", { "data-testid": "recaptcha" });
  };
  return { default: RecaptchaMock };
});
