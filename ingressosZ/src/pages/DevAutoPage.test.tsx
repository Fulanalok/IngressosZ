import { render, screen, waitFor } from "@testing-library/react";
import { signInAnonymously } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { auth } from "../firebaseConfig";
import DevAutoPage from "./DevAutoPage";

// Mock firebase/functions
vi.mock("firebase/functions", () => ({
  httpsCallable: vi.fn(),
}));

// Mock firebase/auth
vi.mock("firebase/auth", () => ({
  signInAnonymously: vi.fn(),
}));

// Mock firebaseConfig
vi.mock("../firebaseConfig", () => ({
  functions: {},
  auth: { currentUser: { uid: "test-uid" } },
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
    const mockSeedDatabase = vi
      .fn()
      .mockResolvedValue({ data: { success: true } });
    (httpsCallable as any).mockReturnValue(mockSeedDatabase);

    render(<DevAutoPage />);

    await waitFor(() => {
      expect(screen.getByText(/Seedando banco de dados/i)).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(httpsCallable).toHaveBeenCalledWith(
        expect.anything(),
        "seedDatabase"
      );
      expect(mockSeedDatabase).toHaveBeenCalled();
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
    const mockSeedDatabase = vi
      .fn()
      .mockResolvedValue({ data: { success: true } });
    (httpsCallable as any).mockReturnValue(mockSeedDatabase);

    render(<DevAutoPage />);

    await waitFor(() => {
      expect(
        screen.getByText(/Autenticando anonimamente/i)
      ).toBeInTheDocument();
    });

    expect(signInAnonymously).toHaveBeenCalledWith(auth);
  });

  it("handles error during execution", async () => {
    const mockSeedDatabase = vi
      .fn()
      .mockRejectedValue(new Error("Seed failed"));
    (httpsCallable as any).mockReturnValue(mockSeedDatabase);

    render(<DevAutoPage />);

    await waitFor(() => {
      expect(screen.getByText(/Erro: Seed failed/i)).toBeInTheDocument();
    });
  });
});
