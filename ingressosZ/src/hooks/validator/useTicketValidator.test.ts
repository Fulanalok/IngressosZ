import { renderHook, act, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { useTicketValidator } from "./useTicketValidator";

// Mock useAuth
vi.mock("../auth/useAuth", () => ({
  useAuth: () => ({
    user: {
      getIdToken: vi.fn().mockResolvedValue("mock-token"),
      email: "test@example.com",
    },
  }),
}));

// Mock global fetch
const globalFetch = global.fetch;

describe("useTicketValidator", () => {
  beforeEach(() => {
    global.fetch = vi.fn();
    vi.clearAllMocks();
  });

  afterEach(() => {
    global.fetch = globalFetch;
  });

  it("should handle successful validation", async () => {
    const mockResponse = {
      success: true,
      ticket: {
        eventTitle: "Test Event",
        ticketType: "VIP",
        holderEmail: "holder@example.com",
        eventDate: "2023-12-31",
        eventTime: "20:00",
      },
    };

    (global.fetch as any).mockResolvedValue({
      ok: true,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("VALID-CODE");
    });

    expect(result.current.validationResult.status).toBe("success");
    expect(result.current.validationResult.ticketData).toEqual({
      eventTitle: "Test Event",
      ticketType: "VIP",
      holderName: "holder@example.com",
      eventDate: "2023-12-31",
      eventTime: "20:00",
    });
    expect(global.fetch).toHaveBeenCalledWith(
      "/functions/validateTicket",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ qrCode: "VALID-CODE" }),
      })
    );
  });

  it("should handle invalid ticket", async () => {
    const mockResponse = {
      success: false,
      message: "Ingresso não encontrado",
    };

    (global.fetch as any).mockResolvedValue({
      ok: true, // API returns 200/404 but fetch is "ok" if network is fine? Actually fetch.ok is false for 4xx/5xx
      // The hook checks resp.ok && data?.success. 
      // If the backend returns 404, resp.ok is false.
      // Let's verify hook logic: "if (resp.ok && data?.success)"
      // So if 404, resp.ok is false, it goes to else.
      status: 404, 
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("INVALID-CODE");
    });

    expect(result.current.validationResult.status).toBe("invalid");
    expect(result.current.validationResult.message).toBe("Ingresso não encontrado");
  });

  it("should handle used ticket", async () => {
    const mockResponse = {
      success: false,
      status: "used",
      message: "Ingresso já utilizado!",
    };

    (global.fetch as any).mockResolvedValue({
      ok: true, // Valid response from server perspective, even if business logic says used?
      // Looking at backend: res.status(200).send({... status: 'used' ...})
      // So resp.ok will be true, but data.success is false.
      status: 200,
      json: async () => mockResponse,
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("USED-CODE");
    });

    expect(result.current.validationResult.status).toBe("error");
    expect(result.current.validationResult.message).toBe("Ingresso já utilizado!");
  });

  it("should handle backend error", async () => {
    (global.fetch as any).mockRejectedValue(new Error("Network Error"));

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("ERROR-CODE");
    });

    expect(result.current.validationResult.status).toBe("error");
    expect(result.current.validationResult.message).toContain(
      "Erro ao validar ingresso no backend"
    );
  });
});
