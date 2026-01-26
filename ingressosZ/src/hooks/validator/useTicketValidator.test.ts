import { renderHook, waitFor, act } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTicketValidator } from "./useTicketValidator";
import { useAuth } from "../useAuth";

vi.mock("../useAuth");
vi.mock("../../services/logger");
vi.mock("../../services/testDataService");

describe("useTicketValidator", () => {
  const mockUser = {
    getIdToken: vi.fn().mockResolvedValue("mock-token"),
    email: "test@example.com",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ user: mockUser });
    global.fetch = vi.fn();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("deve validar um ingresso com sucesso", async () => {
    const mockResponse = {
      success: true,
      ticket: {
        eventTitle: "Evento Teste",
        ticketType: "VIP",
        holderEmail: "holder@example.com",
        eventDate: "2024-01-01",
        eventTime: "20:00",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("TICKET-VALIDO");
    });

    expect(result.current.validationResult.status).toBe("success");
    expect(result.current.validationResult.ticketData?.eventTitle).toBe("Evento Teste");
    expect(global.fetch).toHaveBeenCalledWith(
      expect.stringContaining("/functions/validateTicket"),
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer mock-token",
        }),
        body: JSON.stringify({ qrCode: "TICKET-VALIDO" }),
      })
    );
  });

  it("deve lidar com ingresso inválido", async () => {
    const mockResponse = {
      success: false,
      message: "Código inválido",
      status: "invalid",
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("TICKET-INVALIDO");
    });

    expect(result.current.validationResult.status).toBe("invalid");
    expect(result.current.validationResult.message).toBe("Código inválido");
  });

  it("deve lidar com ingresso já utilizado", async () => {
    const mockResponse = {
      success: false,
      message: "Ingresso já utilizado",
      status: "used",
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("TICKET-USADO");
    });

    expect(result.current.validationResult.status).toBe("error");
    expect(result.current.validationResult.message).toBe("Ingresso já utilizado");
  });

  it("deve lidar com erro no servidor", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Erro de rede"));

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("TICKET-ERRO");
    });

    expect(result.current.validationResult.status).toBe("error");
    expect(result.current.validationResult.message).toContain("Erro ao validar");
  });
});
