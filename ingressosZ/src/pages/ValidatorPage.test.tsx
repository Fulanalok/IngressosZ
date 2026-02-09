import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { useTicketValidator } from "../hooks/validator/useTicketValidator";
import { TestDataService } from "../services/testDataService";
import ValidatorPage from "./ValidatorPage";

// Mock dos hooks
vi.mock("../hooks/useAuth");
vi.mock("../hooks/validator/useTicketValidator");
vi.mock("../services/testDataService");

// Mock dos componentes filhos para simplificar o teste
vi.mock("../components/validator/ScannerSection", () => ({
  ScannerSection: ({ onScan, onError }: any) => (
    <div data-testid="scanner-section">
      <button onClick={() => onScan("TICKET-SCAN")}>Simulate Scan</button>
      <button onClick={() => onError("Scan Error")}>Simulate Error</button>
    </div>
  ),
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
          id: "ticket-123",
          eventId: "event-123",
          eventTitle: "Festa Exemplo",
          sector: "VIP",
          userName: "João",
        },
      },
      isValidating: false,
      resetValidation: mockResetValidation,
    });

    render(<ValidatorPage />);
    expect(screen.getByText("Ingresso válido!")).toBeInTheDocument();
    expect(screen.getByText("Festa Exemplo")).toBeInTheDocument();
  });

  it("popula scans recentes ao validar com sucesso", async () => {
    const ticketResult = {
      status: "success",
      message: "Ingresso válido!",
      ticketData: { id: "t1", eventTitle: "Festa" },
    };
    mockValidateTicket.mockResolvedValue(ticketResult);

    render(<ValidatorPage />);

    const input = screen.getByPlaceholderText(/Ex: TICKET-/);
    fireEvent.change(input, { target: { value: "TICKET-123" } });
    const button = screen.getByRole("button", { name: /Validar Ingresso/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(screen.getByText("Histórico Recente")).toBeInTheDocument();
      expect(screen.getByText("Festa")).toBeInTheDocument();
    });
  });

  it("gera código de teste", () => {
    render(<ValidatorPage />);
    const btn = screen.getByText("Código Teste");
    fireEvent.click(btn);
    const input = screen.getByPlaceholderText(/Ex: TICKET-/);
    expect(input).not.toHaveValue("");
    expect(input.value).toMatch(/^TICKET-/);
  });

  it("processa scan do scanner", async () => {
    mockValidateTicket.mockResolvedValue({ status: "success" });
    render(<ValidatorPage />);

    const scanBtn = screen.getByText("Simulate Scan");
    fireEvent.click(scanBtn);

    expect(mockValidateTicket).toHaveBeenCalledWith("TICKET-SCAN");
  });

  it("processa erro do scanner", () => {
    render(<ValidatorPage />);
    const errBtn = screen.getByText("Simulate Error");
    fireEvent.click(errBtn);
    // Verifies no crash
  });

  it("reseta validação", () => {
    render(<ValidatorPage />);
    const input = screen.getByPlaceholderText(/Ex: TICKET-/);
    fireEvent.change(input, { target: { value: "ABC" } });

    const resetBtn = screen.getByRole("button", { name: /Limpar código/i });
    fireEvent.click(resetBtn);

    expect(input).toHaveValue("");
    expect(mockResetValidation).toHaveBeenCalled();
  });

  it("trata falha no health check (fetch throws)", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network error"));
    render(<ValidatorPage />);
    await waitFor(() => {
      expect(screen.getByText("Backend indisponível")).toBeInTheDocument();
    });
  });

  it("trata health check com resposta nao ok", async () => {
    (global.fetch as any).mockResolvedValue({ ok: false });
    render(<ValidatorPage />);
    expect(screen.queryByText(/Emulador:/)).not.toBeInTheDocument();
    expect(screen.queryByText("Backend indisponível")).not.toBeInTheDocument();
  });

  it("exibe status dos emuladores quando ativos", async () => {
    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => ({
        emulator: true,
        firestoreEmulator: true,
        authEmulator: true,
      }),
    });
    render(<ValidatorPage />);
    await waitFor(() => {
      expect(
        screen.getByText(
          "Emulador: ativo • Firestore: emulador • Auth: emulador"
        )
      ).toBeInTheDocument();
    });
  });

  it("cria dados de teste com sucesso", async () => {
    (TestDataService.initializeTestData as any).mockResolvedValue(undefined);
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});

    render(<ValidatorPage />);

    const btn = screen.getByText("Criar Dados");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("Dados de teste criados com sucesso")
      );
    });
    alertMock.mockRestore();
  });

  it("trata erro ao criar dados de teste", async () => {
    (TestDataService.initializeTestData as any).mockRejectedValue(
      new Error("Failed")
    );
    const alertMock = vi.spyOn(window, "alert").mockImplementation(() => {});
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<ValidatorPage />);

    const btn = screen.getByText("Criar Dados");
    fireEvent.click(btn);

    await waitFor(() => {
      expect(alertMock).toHaveBeenCalledWith(
        expect.stringContaining("Firebase indisponível")
      );
    });

    alertMock.mockRestore();
    consoleSpy.mockRestore();
  });
});
