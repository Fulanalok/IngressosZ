import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "@/hooks/auth/useAuth";
import { useTicketValidator } from "@/hooks/validator/useTicketValidator";
import ValidatorPage from "./ValidatorPage";

vi.mock("@/hooks/auth/useAuth");
vi.mock("../hooks/validator/useTicketValidator");
vi.mock("../services/testDataService");

vi.mock("../components/validator/ScannerSection", () => ({
  ScannerSection: () => <div data-testid="scanner-section">Scanner</div>,
}));

describe("ValidatorPage", () => {
  const mockValidateTicket = vi.fn();
  const mockResetValidation = vi.fn();

  const mockUser = { uid: "validator-uid", email: "validator@example.com" };
  const mockUserProfile = { uid: "validator-uid", email: "validator@example.com", role: "validator" };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({ user: mockUser, userProfile: mockUserProfile });

    (useTicketValidator as any).mockReturnValue({
      validateTicket: mockValidateTicket,
      validationResult: { status: null, message: "" },
      isValidating: false,
      resetValidation: mockResetValidation,
    });

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emulator: false, firestoreEmulator: false, authEmulator: false }),
    });
  });

  it("renderiza corretamente para um validador", () => {
    render(<ValidatorPage />);
    expect(screen.getByText("Validador de Ingressos")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: TICKET-/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Validar Ingresso/i })).toBeInTheDocument();
  });

  it("permite digitar um código de ingresso", () => {
    render(<ValidatorPage />);
    const input = screen.getByPlaceholderText(/Ex: TICKET-/);
    fireEvent.change(input, { target: { value: "TICKET-123" } });
    expect(input).toHaveValue("TICKET-123");
  });

  it("chama validateTicket ao submeter o formulário", () => {
    render(<ValidatorPage />);
    const input = screen.getByPlaceholderText(/Ex: TICKET-/);
    fireEvent.change(input, { target: { value: "TICKET-123" } });
    fireEvent.click(screen.getByRole("button", { name: /Validar Ingresso/i }));
    expect(mockValidateTicket).toHaveBeenCalledWith("TICKET-123");
  });

  it("exibe resultado de sucesso", () => {
    (useTicketValidator as any).mockReturnValue({
      validateTicket: mockValidateTicket,
      validationResult: {
        status: "success",
        message: "Ingresso válido!",
        ticketData: {
          eventTitle: "Show Teste",
          ticketType: "VIP",
          holderName: "João",
          eventDate: "2024-12-31",
          eventTime: "22:00",
        },
      },
      isValidating: false,
      resetValidation: mockResetValidation,
    });
    render(<ValidatorPage />);
    expect(screen.getByText("Ingresso válido!")).toBeInTheDocument();
    expect(screen.getByText("Show Teste")).toBeInTheDocument();
    expect(screen.getByText("João")).toBeInTheDocument();
  });

  it("exibe histórico recente após validação bem-sucedida", async () => {
    const mockResult = {
      status: "success",
      message: "Validado",
      ticketData: { holderName: "Maria", eventTitle: "Festa", ticketType: "Pista" },
    };
    mockValidateTicket.mockResolvedValue(mockResult);
    render(<ValidatorPage />);
    const input = screen.getByPlaceholderText(/Ex: TICKET-/);
    fireEvent.change(input, { target: { value: "TICKET-MARIA" } });
    fireEvent.click(screen.getByRole("button", { name: /Validar Ingresso/i }));
    await waitFor(() => {
      expect(screen.getByText("Histórico Recente")).toBeInTheDocument();
      expect(screen.getByText("Maria")).toBeInTheDocument();
      expect(screen.getByText("VÁLIDO")).toBeInTheDocument();
    });
  });

  it("exibe status do backend após health check", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ emulator: true, firestoreEmulator: false, authEmulator: false }),
    });
    render(<ValidatorPage />);
    await waitFor(() => {
      expect(screen.getByText(/Emulador: ativo/)).toBeInTheDocument();
    });
  });

  it("exibe 'Backend indisponível' quando o health check falha", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    render(<ValidatorPage />);
    await waitFor(() => {
      expect(screen.getByText("Backend indisponível")).toBeInTheDocument();
    });
  });

  it("botão Scanear QR fica desabilitado para role user", () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      userProfile: { ...mockUserProfile, role: "user" },
    });
    render(<ValidatorPage />);
    expect(screen.getByText("Scanear QR").closest("button")).toBeDisabled();
  });

  it("botão Scanear QR fica habilitado para role organizer", () => {
    (useAuth as any).mockReturnValue({
      user: mockUser,
      userProfile: { ...mockUserProfile, role: "organizer" },
    });
    render(<ValidatorPage />);
    expect(screen.getByText("Scanear QR").closest("button")).not.toBeDisabled();
  });

  it("alterna texto do botão ao clicar em Scanear QR", () => {
    render(<ValidatorPage />);
    const btn = screen.getByText("Scanear QR").closest("button")!;
    fireEvent.click(btn);
    expect(screen.getByText("Fechar Scanner")).toBeInTheDocument();
    fireEvent.click(screen.getByText("Fechar Scanner").closest("button")!);
    expect(screen.getByText("Scanear QR")).toBeInTheDocument();
  });

  it("exibe INVÁLIDO no histórico para status invalid", async () => {
    mockValidateTicket.mockResolvedValue({
      status: "invalid",
      message: "Código inválido",
      ticketData: { holderName: "Pedro", eventTitle: "Evento X", ticketType: "VIP" },
    });
    render(<ValidatorPage />);
    fireEvent.change(screen.getByPlaceholderText(/Ex: TICKET-/), {
      target: { value: "TICKET-BAD" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Validar Ingresso/i }));
    await waitFor(() => {
      expect(screen.getByText("INVÁLIDO")).toBeInTheDocument();
    });
  });

  it("exibe USADO no histórico para status error", async () => {
    mockValidateTicket.mockResolvedValue({
      status: "error",
      message: "Ingresso já utilizado",
      ticketData: { holderName: "Ana", eventTitle: "Show", ticketType: "Padrão" },
    });
    render(<ValidatorPage />);
    fireEvent.change(screen.getByPlaceholderText(/Ex: TICKET-/), {
      target: { value: "TICKET-USED" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Validar Ingresso/i }));
    await waitFor(() => {
      expect(screen.getByText("USADO")).toBeInTheDocument();
    });
  });

  it("botão validar fica desabilitado durante isValidating", () => {
    (useTicketValidator as any).mockReturnValue({
      validateTicket: mockValidateTicket,
      validationResult: { status: null, message: "" },
      isValidating: true,
      resetValidation: mockResetValidation,
    });
    render(<ValidatorPage />);
    expect(screen.getByRole("button", { name: /Validando/i })).toBeDisabled();
  });
});
