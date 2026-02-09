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

// jsdom pode não implementar scrollTo; define fallback quando ausente
if (typeof window.scrollTo !== "function") {
  (window as unknown as { scrollTo: () => void }).scrollTo = () => {};
}

// Mock global do IntersectionObserver
const IntersectionObserverMock = vi.fn(() => ({
  disconnect: vi.fn(),
  observe: vi.fn(),
  takeRecords: vi.fn(),
  unobserve: vi.fn(),
}));

vi.stubGlobal('IntersectionObserver', IntersectionObserverMock);

// Mock global do Firebase para evitar erros de inicialização com config vazia
vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({})),
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
