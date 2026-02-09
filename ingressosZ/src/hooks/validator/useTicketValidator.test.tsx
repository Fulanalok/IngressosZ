import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, Mock, vi } from "vitest";
import { TestDataService } from "../../services/testDataService";
import { useAuth } from "../useAuth";
import { useTicketValidator } from "./useTicketValidator";

// Mock dependencies
vi.mock("../useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../../services/testDataService", () => ({
  TestDataService: {
    validateOfflineTicket: vi.fn(),
  },
}));

describe("useTicketValidator", () => {
  const mockGetIdToken = vi.fn();
  const mockUser = {
    email: "test@example.com",
    getIdToken: mockGetIdToken,
  };

  const mockFetch = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = mockFetch;
    (useAuth as unknown as Mock).mockReturnValue({ user: mockUser });

    // Default mock for TestDataService
    (TestDataService.validateOfflineTicket as unknown as Mock).mockReturnValue(
      null
    );
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  it("should initialize with default state", () => {
    const { result } = renderHook(() => useTicketValidator());

    expect(result.current.isValidating).toBe(false);
    expect(result.current.validationResult).toEqual({
      status: null,
      message: "",
    });
  });

  it("should validate ticket successfully via backend", async () => {
    mockGetIdToken.mockResolvedValue("fake-token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        ticket: {
          eventTitle: "Test Event",
          ticketType: "VIP",
          holderEmail: "holder@example.com",
          eventDate: "2023-12-31",
          eventTime: "20:00",
        },
      }),
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("valid-code");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/functions/validateTicket",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer fake-token",
          "Content-Type": "application/json",
        }),
        body: JSON.stringify({ qrCode: "valid-code" }),
      })
    );

    expect(result.current.isValidating).toBe(false);
    expect(result.current.validationResult).toEqual({
      status: "success",
      message: "Ingresso válido! Entrada autorizada.",
      ticketData: {
        eventTitle: "Test Event",
        ticketType: "VIP",
        holderName: "holder@example.com",
        eventDate: "2023-12-31",
        eventTime: "20:00",
      },
    });
  });

  it("should handle backend validation failure (invalid code)", async () => {
    mockGetIdToken.mockResolvedValue("fake-token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        message: "Invalid code",
        status: "invalid",
      }),
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("invalid-code");
    });

    expect(result.current.validationResult).toEqual({
      status: "invalid",
      message: "Invalid code",
    });
  });

  it("should handle backend validation failure (used code)", async () => {
    mockGetIdToken.mockResolvedValue("fake-token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        message: "Ticket used",
        status: "used",
      }),
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("used-code");
    });

    expect(result.current.validationResult).toEqual({
      status: "error",
      message: "Ticket used",
    });
  });

  it("should fallback to offline validation when backend fails (DEV mode - success)", async () => {
    // Simulate backend error
    mockFetch.mockRejectedValue(new Error("Network error"));

    // Mock TestDataService for successful offline validation
    (TestDataService.validateOfflineTicket as unknown as Mock).mockReturnValue({
      status: "valid",
      eventTitle: "Offline Event",
      ticketType: "General",
      userEmail: "offline@example.com",
      eventDate: "2024-01-01",
      eventTime: "10:00",
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("offline-valid-code");
    });

    expect(result.current.validationResult).toEqual({
      status: "success",
      message: "Ingresso válido! Entrada autorizada.",
      ticketData: {
        eventTitle: "Offline Event",
        ticketType: "General",
        holderName: "offline@example.com",
        eventDate: "2024-01-01",
        eventTime: "10:00",
      },
    });
  });

  it("should fallback to offline validation when backend fails (DEV mode - used)", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));

    (TestDataService.validateOfflineTicket as unknown as Mock).mockReturnValue({
      status: "used",
      eventTitle: "Offline Event",
      ticketType: "General",
      userEmail: "offline@example.com",
      eventDate: "2024-01-01",
      eventTime: "10:00",
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("offline-used-code");
    });

    expect(result.current.validationResult).toEqual({
      status: "error",
      message: "Este ingresso já foi utilizado.",
      ticketData: {
        eventTitle: "Offline Event",
        ticketType: "General",
        holderName: "offline@example.com",
        eventDate: "2024-01-01",
        eventTime: "10:00",
      },
    });
  });

  it("should handle backend failure and offline validation failure (generic error)", async () => {
    mockFetch.mockRejectedValue(new Error("Network error"));
    (TestDataService.validateOfflineTicket as unknown as Mock).mockReturnValue(
      null
    );

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("unknown-code");
    });

    expect(result.current.validationResult).toEqual({
      status: "error",
      message: "Erro ao validar ingresso no backend. Tente novamente.",
    });
  });

  it("should handle missing token/user", async () => {
    (useAuth as unknown as Mock).mockReturnValue({ user: null });
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        ticket: { eventTitle: "T" },
      }),
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("code");
    });

    expect(mockFetch).toHaveBeenCalledWith(
      expect.stringContaining("/functions/validateTicket"),
      expect.objectContaining({
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      })
    );
  });

  it("should handle missing ticket fields (defaults)", async () => {
    mockGetIdToken.mockResolvedValue("token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        ticket: {}, // Empty ticket
      }),
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("code");
    });

    expect(result.current.validationResult.ticketData).toEqual({
      eventTitle: "Evento",
      ticketType: "Geral",
      holderName: "test@example.com", // Fallback to user.email
      eventDate: expect.any(String), // new Date()
      eventTime: "",
    });
  });

  it("should handle missing offline ticket fields", async () => {
    mockFetch.mockRejectedValue(new Error("Net error"));
    (TestDataService.validateOfflineTicket as unknown as Mock).mockReturnValue({
      status: "valid",
      eventTitle: "Offline",
      ticketType: "Geral",
      userEmail: "off@mail.com",
      eventDate: "2024",
      // eventTime missing
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("code");
    });

    expect(result.current.validationResult.ticketData?.eventTime).toBe("");
  });

  it("should skip offline validation when not in DEV mode", async () => {
    // Save original env
    const originalDev = (import.meta as any).env.DEV;
    // Mock DEV to false
    // @ts-ignore
    import.meta.env.DEV = false;

    mockFetch.mockRejectedValue(new Error("Net error"));

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("code");
    });

    expect(TestDataService.validateOfflineTicket).not.toHaveBeenCalled();
    expect(result.current.validationResult.status).toBe("error");

    // Restore env
    // @ts-ignore
    import.meta.env.DEV = originalDev;
  });

  it("should reset validation state", async () => {
    const { result } = renderHook(() => useTicketValidator());

    // Set some state first
    act(() => {
      // @ts-ignore - manipulating state directly for test setup if exposed, or just run a validation
    });

    // Better to run a validation first
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({ success: false, message: "Error" }),
    });
    await act(async () => {
      await result.current.validateTicket("code");
    });

    expect(result.current.validationResult.status).not.toBeNull();

    act(() => {
      result.current.resetValidation();
    });

    expect(result.current.validationResult).toEqual({
      status: null,
      message: "",
    });
  });

  it("should use default fallback message if backend returns no message", async () => {
    mockGetIdToken.mockResolvedValue("fake-token");
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: false,
        // no message
        status: "invalid",
      }),
    });

    const { result } = renderHook(() => useTicketValidator());

    await act(async () => {
      await result.current.validateTicket("invalid-code");
    });

    expect(result.current.validationResult.message).toBe(
      "Código do ingresso inválido. Verifique e tente novamente."
    );
  });
});
