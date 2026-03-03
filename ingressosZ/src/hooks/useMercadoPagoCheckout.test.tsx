import { act, renderHook, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/authContext";
import { useMercadoPagoCheckout } from "./useMercadoPagoCheckout";

const mockNavigate = vi.fn();

vi.mock("react-router-dom", async () => {
  const actual = await vi.importActual<typeof import("react-router-dom")>(
    "react-router-dom"
  );
  return {
    ...actual,
    useNavigate: () => mockNavigate,
  };
});

vi.mock("../firebaseConfig", () => ({
  db: {},
}));

vi.mock("firebase/firestore", () => ({
  addDoc: vi.fn(async () => ({ id: "ps1" })),
  collection: vi.fn(),
  serverTimestamp: vi.fn(),
}));

const mockHttpsCallable = vi.fn();
vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => mockHttpsCallable),
}));

vi.mock("../services/firestore", () => ({
  eventService: {
    decrementAvailableTickets: vi.fn(),
  },
}));

import type { AuthContextType } from "../context/authContext";
function wrapperWithAuth(value: AuthContextType) {
  return ({ children }: { children: React.ReactNode }) => (
    <MemoryRouter>
      <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
    </MemoryRouter>
  );
}

describe("useMercadoPagoCheckout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("não cria preferência quando falta userId", async () => {
    const event = {
      id: "e1",
      title: "Evento",
      price: 100,
    } as any;
    const wrapper = wrapperWithAuth({
      user: null,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => null,
      getAuthHeaders: async () => ({}),
    });
    const { result } = renderHook(
      () => useMercadoPagoCheckout(event, "standard", 1, "", "e@example.com"),
      { wrapper }
    );
    await act(async () => {
      const res = await result.current.createPreference();
      expect(res).toBeUndefined();
    });
    expect(result.current.error).toBeNull();
  });

  it("define preferenceId quando a API retorna preferenceId", async () => {
    const event = {
      id: "e1",
      title: "Evento",
      price: 100,
    } as any;
    mockHttpsCallable.mockResolvedValue({
      data: { id: "pref-123" },
    });

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
      () => useMercadoPagoCheckout(event, "vip", 2, "u1", "e@example.com"),
      { wrapper }
    );

    await act(async () => {
      await result.current.createPreference();
    });

    await waitFor(() => {
      expect(result.current.preferenceId).toBe("pref-123");
    });
  });

  it("processa sucesso de pagamento e navega", async () => {
    const event = {
      id: "e1",
      title: "Evento",
      price: 100,
    } as any;
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
      () => useMercadoPagoCheckout(event, "standard", 2, "u1", "e@example.com"),
      { wrapper }
    );
    await act(async () => {
      await result.current.handlePaymentSuccess("pay-1");
    });
    expect(decSpy).toHaveBeenCalledTimes(2);
    expect(mockNavigate).toHaveBeenCalledWith(
      "/pagamento/sucesso?payment_id=pay-1"
    );
  });
});
