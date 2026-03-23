import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FirebaseError } from "firebase/app";
import { signInWithEmailAndPassword } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import Login from "./Login";

// Mock firebaseConfig
vi.mock("../firebaseConfig", () => ({
  auth: {},
  functions: {},
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: undefined }),
  Link: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: () => ({
    user: null,
    loading: false,
  }),
}));

// Mock sonner
vi.mock("sonner", () => ({
  toast: {
    error: vi.fn(),
  },
}));

describe("Login", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders login form", () => {
    render(<Login />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/senha/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /entrar/i })).toBeInTheDocument();
  });

  it("handles successful login", async () => {
    (signInWithEmailAndPassword as any).mockResolvedValue({});

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password123" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(signInWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "test@example.com",
        "password123"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("handles login error", async () => {
    const error = new FirebaseError("auth/invalid-credential", "Invalid creds");
    (signInWithEmailAndPassword as any).mockRejectedValue(error);

    render(<Login />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "wrongpass" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText("E-mail ou senha inválidos.")
      ).toBeInTheDocument();
    });
  });

  it("handles too many requests error", async () => {
    const error = new FirebaseError(
      "auth/too-many-requests",
      "Too many requests"
    );
    (signInWithEmailAndPassword as any).mockRejectedValue(error);

    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Muitas tentativas de login. Tente novamente mais tarde."
        )
      ).toBeInTheDocument();
    });
  });

  it("handles network request failed error", async () => {
    const error = new FirebaseError(
      "auth/network-request-failed",
      "Network error"
    );
    (signInWithEmailAndPassword as any).mockRejectedValue(error);

    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Falha de rede ao tentar entrar. Verifique sua conexão e tente novamente."
        )
      ).toBeInTheDocument();
    });
  });

  it("handles configuration not found error", async () => {
    const error = new FirebaseError(
      "auth/configuration-not-found",
      "Config error"
    );
    (signInWithEmailAndPassword as any).mockRejectedValue(error);

    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Erro de configuração do Firebase. Verifique as configurações do projeto."
        )
      ).toBeInTheDocument();
    });
  });

  it("handles api key not valid error", async () => {
    const error = new FirebaseError("auth/api-key-not-valid", "API key error");
    (signInWithEmailAndPassword as any).mockRejectedValue(error);

    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Chave de API do Firebase inválida.")
      ).toBeInTheDocument();
    });
  });

  it("handles default firebase error", async () => {
    const error = new FirebaseError("auth/unknown-error", "Unknown error");
    (signInWithEmailAndPassword as any).mockRejectedValue(error);

    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText(
          "Não foi possível fazer login. Tente novamente em alguns instantes."
        )
      ).toBeInTheDocument();
    });
  });

  it("handles generic error", async () => {
    const error = new Error("Generic error");
    (signInWithEmailAndPassword as any).mockRejectedValue(error);

    render(<Login />);
    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/senha/i), {
      target: { value: "password" },
    });
    fireEvent.click(screen.getByRole("button", { name: /entrar/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Ocorreu um erro ao fazer login.")
      ).toBeInTheDocument();
    });
  });
});
