import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { FirebaseError } from "firebase/app";
import { createUserWithEmailAndPassword } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SignUp from "./SignUp";

// Mock firebase/app
vi.mock("firebase/app", () => {
  return {
    FirebaseError: class extends Error {
      code: string;
      constructor(code: string, message: string) {
        super(message);
        this.code = code;
        this.name = "FirebaseError";
      }
    },
    initializeApp: vi.fn(),
  };
});

// Mock firebase/auth
vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(),
  createUserWithEmailAndPassword: vi.fn(),
}));

// Mock firebaseConfig
vi.mock("../firebaseConfig", () => ({
  auth: {},
}));

// Mock react-router-dom
const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useNavigate: () => mockNavigate,
  useLocation: () => ({ state: undefined }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
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

describe("SignUp", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders signup form", () => {
    render(<SignUp />);
    expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/^senha$/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/confirmar senha/i)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /criar conta gratuita/i })
    ).toBeInTheDocument();
  });

  it("handles successful signup", async () => {
    (createUserWithEmailAndPassword as any).mockResolvedValue({
      user: { uid: "123" },
    });

    render(<SignUp />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "new@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /criar conta gratuita/i })
    );

    await waitFor(() => {
      expect(createUserWithEmailAndPassword).toHaveBeenCalledWith(
        expect.anything(),
        "new@example.com",
        "password123"
      );
      expect(mockNavigate).toHaveBeenCalledWith("/", { replace: true });
    });
  });

  it("validates password mismatch", async () => {
    render(<SignUp />);

    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "different" },
    });

    const form = screen
      .getByRole("button", { name: /criar conta gratuita/i })
      .closest("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText("As senhas não coincidem.")).toBeInTheDocument();
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });

  it("validates short password", async () => {
    render(<SignUp />);

    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "123" },
    });

    // Bypass HTML5 validation by using fireEvent.submit on the form directly
    // logic is inside handleSignUp which is called on submit
    const form = screen
      .getByRole("button", { name: /criar conta gratuita/i })
      .closest("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(
        screen.getByText("A senha deve ter pelo menos 6 caracteres.")
      ).toBeInTheDocument();
      expect(createUserWithEmailAndPassword).not.toHaveBeenCalled();
    });
  });

  it.each([
    ["auth/weak-password", "A senha deve ter pelo menos 6 caracteres."],
    ["auth/invalid-email", "E-mail inválido."],
    ["auth/network-request-failed", "Falha de rede ao criar conta. Verifique sua conexão e tente novamente."],
    ["auth/configuration-not-found", "Erro de configuração do Firebase. Verifique as configurações do projeto."],
    ["auth/api-key-not-valid", "Chave de API do Firebase inválida."],
    ["auth/unknown-error", "Não foi possível criar a conta. Tente novamente em alguns instantes."],
  ])("handles firebase error code %s", async (code, expectedMessage) => {
    const error = new FirebaseError(code, "Error message");
    (createUserWithEmailAndPassword as any).mockRejectedValue(error);

    render(<SignUp />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    });

    const form = screen
      .getByRole("button", { name: /criar conta gratuita/i })
      .closest("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(screen.getByText(expectedMessage)).toBeInTheDocument();
    });
  });

  it("handles signup error (email already in use)", async () => {
    const error = new FirebaseError(
      "auth/email-already-in-use",
      "Email exists"
    );
    (createUserWithEmailAndPassword as any).mockRejectedValue(error);

    render(<SignUp />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "existing@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    });

    const form = screen
      .getByRole("button", { name: /criar conta gratuita/i })
      .closest("form");
    fireEvent.submit(form!);

    await waitFor(() => {
      expect(
        screen.getByText("Este e-mail já está em uso.")
      ).toBeInTheDocument();
    });
  });

  it("handles signup error (generic)", async () => {
    const error = new Error("Generic error");
    (createUserWithEmailAndPassword as any).mockRejectedValue(error);

    render(<SignUp />);

    fireEvent.change(screen.getByLabelText(/email/i), {
      target: { value: "test@example.com" },
    });
    fireEvent.change(screen.getByLabelText(/^senha$/i), {
      target: { value: "password123" },
    });
    fireEvent.change(screen.getByLabelText(/confirmar senha/i), {
      target: { value: "password123" },
    });
    fireEvent.click(
      screen.getByRole("button", { name: /criar conta gratuita/i })
    );

    await waitFor(() => {
      expect(
        screen.getByText("Ocorreu um erro ao criar a conta.")
      ).toBeInTheDocument();
    });
  });
});
