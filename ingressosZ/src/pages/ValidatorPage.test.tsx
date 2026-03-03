import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { useTicketValidator } from "../hooks/validator/useTicketValidator";
import ValidatorPage from "./ValidatorPage";

// Mock dos hooks
vi.mock("../hooks/useAuth");
vi.mock("../hooks/validator/useTicketValidator");
vi.mock("../services/testDataService");

// Mock dos componentes filhos para simplificar o teste
vi.mock("../components/validator/ScannerSection", () => ({
  ScannerSection: () => <div data-testid="scanner-section">Scanner</div>,
}));

describe("ValidatorPage", () => {
  const mockValidateTicket = vi.fn();
  const mockResetValidation = vi.fn();

  const mockUser = {
    uid: "validator-uid",
    email: "validator@example.com",
  };

  const mockUserProfile = {
    uid: "validator-uid",
    email: "validator@example.com",
    role: "validator",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    (useAuth as any).mockReturnValue({
      user: mockUser,
      userProfile: mockUserProfile,
    });

    (useTicketValidator as any).mockReturnValue({
      validateTicket: mockValidateTicket,
      validationResult: { status: null, message: "" },
      isValidating: false,
      resetValidation: mockResetValidation,
    });

    // Mock global fetch for health check
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        emulator: false,
        firestoreEmulator: false,
        authEmulator: false,
      }),
    });
  });

  it("renderiza corretamente para um validador", () => {
    render(<ValidatorPage />);

    expect(screen.getByText("Validador de Ingressos")).toBeInTheDocument();
    expect(screen.getByPlaceholderText(/Ex: TICKET-/)).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Validar Ingresso/i })
    ).toBeInTheDocument();
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

    const button = screen.getByRole("button", { name: /Validar Ingresso/i });
    fireEvent.click(button);

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

  it("exibe histórico recente após validação", async () => {
    // Setup para retornar um resultado na validação
    const mockResult = {
      status: "success",
      message: "Validado",
      ticketData: {
        holderName: "Maria",
        eventTitle: "Festa",
        ticketType: "Pista",
      },
    };
    mockValidateTicket.mockResolvedValue(mockResult);

    render(<ValidatorPage />);

    const input = screen.getByPlaceholderText(/Ex: TICKET-/);
    fireEvent.change(input, { target: { value: "TICKET-MARIA" } });

    const button = screen.getByRole("button", { name: /Validar Ingresso/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Histórico Recente")).toBeInTheDocument();
      expect(screen.getByText("Maria")).toBeInTheDocument();
      expect(screen.getByText("VÁLIDO")).toBeInTheDocument();
    });
  });
});
