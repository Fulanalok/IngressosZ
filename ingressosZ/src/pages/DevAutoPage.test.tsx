import { render, screen, waitFor } from "@testing-library/react";
import { signInAnonymously } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "../firebaseConfig";
import DevAutoPage from "./DevAutoPage";
import { TestDataService } from "../services/testDataService";

// Mock firebase/auth
vi.mock("firebase/auth", () => ({
  signInAnonymously: vi.fn(),
}));

// Mock firebaseConfig
vi.mock("../firebaseConfig", () => ({
  functions: {},
  auth: { currentUser: { uid: "test-uid" } },
}));

vi.mock("../services/testDataService", () => ({
  TestDataService: {
    createTestEvents: vi.fn(),
  },
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
}));

describe("DevAutoPage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (auth as any).currentUser = { uid: "test-uid" };
  });

  it("calls seedDatabase function on mount", async () => {
    (TestDataService.createTestEvents as any).mockResolvedValue(["e1"]);

    render(<DevAutoPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Criando eventos de teste/i)
      ).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(TestDataService.createTestEvents).toHaveBeenCalled();
      expect(
        screen.getByText("Concluído! Redirecionando...")
      ).toBeInTheDocument();
      expect(mockNavigate).toHaveBeenCalledWith("/meus-ingressos", {
        replace: true,
      });
    });
  });

  it("authenticates anonymously if no user", async () => {
    (auth as any).currentUser = null;
    (TestDataService.createTestEvents as any).mockResolvedValue(["e1"]);

    render(<DevAutoPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Autenticando anonimamente/i)
      ).toBeInTheDocument();
    });

    expect(signInAnonymously).toHaveBeenCalledWith(auth);
  });

  it("handles error during execution", async () => {
    (TestDataService.createTestEvents as any).mockRejectedValue(
      new Error("Seed failed")
    );

    render(<DevAutoPage />);

    await waitFor(() => {
      expect(screen.getByText(/Erro: Seed failed/i)).toBeInTheDocument();
    });
  });
});
