import "@testing-library/jest-dom";
import { vi } from "vitest";
Object.defineProperty(window, "matchMedia", {
    writable: true,
    value: (query) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { },
        removeListener: () => { },
        addEventListener: () => { },
        removeEventListener: () => { },
        dispatchEvent: () => false,
    }),
});
// jsdom pode não implementar scrollTo; define fallback quando ausente
if (typeof window.scrollTo !== "function") {
    window.scrollTo = () => { };
}
// Mock global do Firebase para evitar erros de inicialização com config vazia
vi.mock("firebase/app", () => ({
    initializeApp: vi.fn(() => ({})),
}));
vi.mock("firebase/auth", async () => {
    const actual = await vi.importActual("firebase/auth");
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
    const actual = await vi.importActual("firebase/firestore");
    return {
        ...actual,
        getFirestore: vi.fn(() => ({})),
        connectFirestoreEmulator: vi.fn(),
    };
});
