import "@testing-library/jest-dom";
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
if (typeof window.scrollTo !== "function") {
  (window as unknown as { scrollTo: () => void }).scrollTo = () => {};
}

// Mock global do Firebase para evitar erros de inicialização com config vazia
vi.mock("firebase/app", () => ({
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
  };
});

vi.mock("firebase/analytics", async () => {
  const actual = await vi.importActual<typeof import("firebase/analytics")>(
    "firebase/analytics"
  );
  return {
    ...actual,
    getAnalytics: vi.fn(() => ({})),
  };
});
