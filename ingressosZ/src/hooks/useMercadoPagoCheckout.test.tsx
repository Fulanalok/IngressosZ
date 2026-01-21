import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/authContext";
import { useMercadoPagoCheckout } from "./useMercadoPagoCheckout";

vi.mock("../firebaseConfig", () => ({
  auth: { currentUser: { uid: "u1", email: "e@example.com" } },
}));
vi.mock("../services/firestore", () => ({
  ticketService: {
    createTicket: async () => "t1",
  },
  eventService: {
    decrementAvailableTickets: async () => {},
  },
}));

import type { AuthContextType } from "../context/authContext";
function wrapperWithAuth(value: AuthContextType) {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

describe("useMercadoPagoCheckout", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("retorna erro quando usuário não autenticado", async () => {
    const wrapper = wrapperWithAuth({
      user: null,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => null,
      getAuthHeaders: async () => ({}),
    });
    const { result } = renderHook(
      () =>
        useMercadoPagoCheckout({
          eventId: "e1",
          ticketType: "standard",
          quantity: 1,
        }),
      { wrapper }
    );
    await act(async () => {
      const res = await result.current.createPreference();
      expect(res).toBeNull();
    });
    expect(result.current.error).toBe("Usuário não autenticado");
  });

  it("envia cabeçalhos de auth e idempotência e faz retry", async () => {
    const assign = vi.fn();
    Object.defineProperty(window, "location", {
      value: { assign, origin: "http://localhost" },
    });
    const fetchMock: (
      input: RequestInfo,
      init?: RequestInit
    ) => Promise<Response> = vi
      .fn()
      .mockResolvedValueOnce({
        ok: false,
        status: 500,
        text: () => Promise.resolve("err"),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: false,
        status: 429,
        text: () => Promise.resolve("rate"),
      } as unknown as Response)
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        json: () =>
          Promise.resolve({
            init_point: "https://www.mercadopago.com/checkout",
          }),
      } as unknown as Response);
    const spy = vi
      .spyOn(window, "fetch")
      .mockImplementation(fetchMock as unknown as typeof fetch);

    const wrapper = wrapperWithAuth({
      user: {
        uid: "u1",
        email: "e@example.com",
      } as unknown as import("firebase/auth").User,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "token-123",
      getAuthHeaders: async () => ({ Authorization: "Bearer token-123" }),
    });

    const { result } = renderHook(
      () =>
        useMercadoPagoCheckout({
          eventId: "e1",
          ticketType: "vip",
          quantity: 2,
        }),
      { wrapper }
    );

    await act(async () => {
      const res = await result.current.createPreference();
      expect(res?.url).toContain("mercadopago");
    });

    expect(spy).toHaveBeenCalledTimes(3);
    const lastCall = spy.mock.calls[2]!;
    const headers = lastCall[1]!.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer token-123");
    expect(headers["X-Idempotency-Key"]).toBeDefined();
    expect(assign).toHaveBeenCalled();
  });

  it("simula pagamento em DEV após redirecionamento inválido", async () => {
    (import.meta as unknown as { env: Record<string, unknown> }).env.DEV =
      false;
    vi.spyOn(window, "fetch").mockResolvedValue({
      ok: true,
      status: 200,
      json: () => Promise.resolve({ init_point: "http://malicious.com" }),
    } as unknown as Response);
    const decSpy = vi.spyOn(
      (await import("../services/firestore")).eventService,
      "decrementAvailableTickets"
    );
    const wrapper = wrapperWithAuth({
      user: {
        uid: "u1",
        email: "e@example.com",
      } as unknown as import("firebase/auth").User,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "token-123",
      getAuthHeaders: async () => ({ Authorization: "Bearer token-123" }),
    });
    const { result } = renderHook(
      () =>
        useMercadoPagoCheckout({
          eventId: "e1",
          ticketType: "standard",
          quantity: 1,
        }),
      { wrapper }
    );
    await act(async () => {
      const res = await result.current.createPreference();
      expect(res?.url).toBe("/pagamento/sucesso");
    });
    expect(["succeeded", "failed"]).toContain(result.current.paymentStatus);
    expect(decSpy).toHaveBeenCalled();
  });
});
