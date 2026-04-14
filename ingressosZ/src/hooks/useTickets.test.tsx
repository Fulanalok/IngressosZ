import { act, renderHook, waitFor } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { describe, expect, it, vi } from "vitest";
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
      status: "valid",
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
      status: "valid",
      price: 120,
      ticketType: "vip",
    },
  ];
  const getUserTickets = vi
    .fn<() => Promise<Ticket[]>>()
    .mockResolvedValueOnce(ticketsA)
    .mockResolvedValue(ticketsB);

  const subscribeToUserTickets = vi.fn((userId, onUpdate, onError) => {
    // Return ticketsA initially, then ticketsB on subsequent calls if needed
    // But since the test uses refetch which triggers re-subscription,
    // we can check how many times it was called.
    if (subscribeToUserTickets.mock.calls.length === 1) {
      onUpdate(ticketsA);
    } else {
      onUpdate(ticketsB);
    }
    return () => {}; // Unsubscribe mock
  });

  const getTicketForValidation = vi.fn();

  return {
    ...mod,
    ticketService: {
      ...mod.ticketService,
      getUserTickets,
      subscribeToUserTickets,
      getTicketForValidation,
    },
  };
});

import { useUserTickets } from "./useTickets";

function wrapperWithQueryClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

describe("useUserTickets", () => {
  it("retorna lista vazia quando não há usuário", async () => {
    const wrapper = wrapperWithQueryClient();
    const { result } = renderHook(() => useUserTickets(undefined), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.tickets).toBeUndefined();
    expect(result.current.isLoading).toBe(false);
    expect(result.current.error).toBeNull();
  });

  it("carrega ingressos do usuário", async () => {
    const wrapper = wrapperWithQueryClient();
    const { result } = renderHook(() => useUserTickets("u1"), { wrapper });
    await waitFor(() => {
      expect(result.current.tickets?.length).toBe(1);
    });
    expect(result.current.error).toBeNull();
  });
});
