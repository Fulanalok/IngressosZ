import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AuthContextType } from "../context/authContext";
import { AuthContext } from "../context/authContext";
import type { Ticket } from "../types";

vi.mock("../services/firestore", async (orig) => {
  const mod = await orig<typeof import("../services/firestore")>();
  const ticketsA: Ticket[] = [
    {
      id: "t1",
      eventId: "e1",
      userId: "u1",
      userEmail: "u1@example.com",
      purchaseDate: new Date().toISOString(),
      qrCode: "qr1",
      status: "active",
      price: 100,
      ticketType: "standard",
    },
  ];
  const ticketsB: Ticket[] = [
    ...ticketsA,
    {
      id: "t2",
      eventId: "e1",
      userId: "u1",
      userEmail: "u1@example.com",
      purchaseDate: new Date().toISOString(),
      qrCode: "qr2",
      status: "active",
      price: 120,
      ticketType: "vip",
    },
  ];
  const getUserTickets = vi
    .fn<() => Promise<Ticket[]>>()
    .mockResolvedValueOnce(ticketsA)
    .mockResolvedValue(ticketsB);
  const createTicket = vi.fn(async () => "t2");
  return {
    ...mod,
    ticketService: {
      ...mod.ticketService,
      getUserTickets,
      createTicket,
    },
  };
});

import { useUserTickets } from "./useTickets";

function wrapperWithAuth(value: AuthContextType) {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

describe("useUserTickets", () => {
  it("retorna lista vazia quando não há usuário", async () => {
    const wrapper = wrapperWithAuth({
      user: null,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => null,
      getAuthHeaders: async () => ({}),
    });
    const { result } = renderHook(() => useUserTickets(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.tickets.length).toBe(0);
    expect(result.current.loading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("carrega ingressos do usuário e permite refetch", async () => {
    const wrapper = wrapperWithAuth({
      user: {
        uid: "u1",
        email: "u1@example.com",
      } as unknown as import("firebase/auth").User,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "token",
      getAuthHeaders: async () => ({ Authorization: "Bearer token" }),
    });
    const { result } = renderHook(() => useUserTickets(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.tickets.length).toBe(1);
    expect(result.current.error).toBeNull();
    await act(async () => {
      await result.current.refetch();
    });
    expect(result.current.tickets.length).toBe(2);
  });

  it("createTicket chama serviço e atualiza a lista", async () => {
    const wrapper = wrapperWithAuth({
      user: {
        uid: "u1",
        email: "u1@example.com",
      } as unknown as import("firebase/auth").User,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "token",
      getAuthHeaders: async () => ({ Authorization: "Bearer token" }),
    });
    const { result } = renderHook(() => useUserTickets(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    await act(async () => {
      const id = await result.current.createTicket({
        eventId: "e1",
        userId: "u1",
        userEmail: "u1@example.com",
        status: "active",
        ticketType: "standard",
        price: 100,
      });
      expect(id).toBe("t2");
    });
    expect(result.current.tickets.length).toBe(2);
  });
});
