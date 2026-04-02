import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import SetAdminRole from "./SetAdminRole";

// ── mocks ──────────────────────────────────────────────────────────────────────

const mockSearchUserByEmail = vi.fn();

vi.mock("@/services/firestore", () => ({
  userService: {
    searchUserByEmail: (...args: unknown[]) => mockSearchUserByEmail(...args),
  },
}));

const mockCallable = vi.fn();
vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockCallable),
}));

vi.mock("@/services/firebaseConfig", () => ({
  app: {},
  db: {},
  auth: {},
  functions: {},
  storage: {},
}));

// ── helpers ────────────────────────────────────────────────────────────────────

const foundUser = {
  uid: "uid-abc",
  email: "joao@example.com",
  displayName: "João",
  role: "user" as const,
  createdAt: null,
};

// ── tests ──────────────────────────────────────────────────────────────────────

describe("SetAdminRole", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza campo de email e botão Buscar", () => {
    render(<SetAdminRole />);
    expect(screen.getByPlaceholderText("E-mail do usuário")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Buscar" })).toBeInTheDocument();
  });

  it("botão Buscar desabilitado quando email está vazio", () => {
    render(<SetAdminRole />);
    expect(screen.getByRole("button", { name: "Buscar" })).toBeDisabled();
  });

  it("botão Buscar habilitado após digitar email", () => {
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    expect(screen.getByRole("button", { name: "Buscar" })).toBeEnabled();
  });

  it("exibe 'Buscando…' durante a busca", async () => {
    mockSearchUserByEmail.mockReturnValue(new Promise(() => {})); // never resolves
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Buscar" }));
    expect(await screen.findByText("Buscando…")).toBeInTheDocument();
  });

  it("exibe usuário encontrado após busca bem-sucedida", async () => {
    mockSearchUserByEmail.mockResolvedValue(foundUser);
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("joao@example.com")).toBeInTheDocument();
    });
    expect(screen.getByText(/uid-abc/)).toBeInTheDocument();
  });

  it("exibe papel atual do usuário encontrado", async () => {
    mockSearchUserByEmail.mockResolvedValue(foundUser);
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Usuário")).toBeInTheDocument();
    });
  });

  it("exibe mensagem de erro quando usuário não encontrado", async () => {
    mockSearchUserByEmail.mockResolvedValue(null);
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "naoexiste@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form")!);
    await waitFor(() => {
      expect(
        screen.getByText("Nenhum usuário encontrado com esse e-mail.")
      ).toBeInTheDocument();
    });
  });

  it("exibe mensagem de erro quando busca lança exceção", async () => {
    mockSearchUserByEmail.mockRejectedValue(new Error("Falha de rede"));
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByText("Erro ao buscar usuário.")).toBeInTheDocument();
    });
  });

  it("exibe select de novo papel após encontrar usuário", async () => {
    mockSearchUserByEmail.mockResolvedValue(foundUser);
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form")!);
    await waitFor(() => {
      expect(screen.getByRole("combobox")).toBeInTheDocument();
    });
    expect(screen.getByRole("option", { name: "Validador" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Organizador" })).toBeInTheDocument();
    expect(screen.getByRole("option", { name: "Admin" })).toBeInTheDocument();
  });

  it("aplica papel e exibe mensagem de sucesso", async () => {
    mockSearchUserByEmail.mockResolvedValue(foundUser);
    mockCallable.mockResolvedValue({
      data: { success: true, message: "Papel aplicado com sucesso!" },
    });
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form")!);
    await waitFor(() => screen.getByRole("combobox"));

    // Seleciona Organizador
    fireEvent.change(screen.getByRole("combobox"), { target: { value: "organizer" } });
    fireEvent.click(screen.getByRole("button", { name: /Definir como/i }));

    await waitFor(() => {
      expect(screen.getByText("Papel aplicado com sucesso!")).toBeInTheDocument();
    });
  });

  it("exibe mensagem de erro quando aplicação do papel falha", async () => {
    mockSearchUserByEmail.mockResolvedValue(foundUser);
    mockCallable.mockRejectedValue(new Error("Sem permissão"));
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form")!);
    await waitFor(() => screen.getByRole("combobox"));

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "organizer" } });
    fireEvent.click(screen.getByRole("button", { name: /Definir como/i }));

    await waitFor(() => {
      expect(screen.getByText("Sem permissão")).toBeInTheDocument();
    });
  });

  it("botão Definir desabilitado quando papel selecionado é igual ao atual", async () => {
    mockSearchUserByEmail.mockResolvedValue({ ...foundUser, role: "validator" as const });
    render(<SetAdminRole />);
    fireEvent.change(screen.getByPlaceholderText("E-mail do usuário"), {
      target: { value: "joao@example.com" },
    });
    fireEvent.submit(screen.getByRole("button", { name: "Buscar" }).closest("form")!);
    await waitFor(() => screen.getByRole("combobox"));
    // Role atual do usuário é "validator", select começa em "validator" → botão desabilitado
    expect(screen.getByRole("button", { name: /Definir como/i })).toBeDisabled();
  });
});
