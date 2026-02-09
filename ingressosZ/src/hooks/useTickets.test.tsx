import { act, renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
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

  const subscribeToUserTickets = vi.fn((_userId, onUpdate, _onError) => {
    onUpdate(ticketsA);
    return vi.fn();
  });

  const createTicket = vi.fn(async () => "t2");

  const getTicketForValidation = vi.fn();
  const markTicketAsUsed = vi.fn();

  return {
    ...mod,
    ticketService: {
      ...mod.ticketService,
      getUserTickets,
      subscribeToUserTickets,
      createTicket,
      getTicketForValidation,
      markTicketAsUsed,
    },
  };
});

import { ticketService } from "../services/firestore";
import { useTicketValidation, useUserTickets } from "./useTickets";

function wrapperWithAuth(value: AuthContextType) {
  return ({ children }: { children: React.ReactNode }) => (
    <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
  );
}

describe("useUserTickets", () => {
  beforeEach(() => {
    vi.mocked(ticketService.subscribeToUserTickets).mockReset();
    vi.mocked(ticketService.subscribeToUserTickets).mockImplementation(
      (_userId, onUpdate) => {
        onUpdate([
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
        ]);
        return vi.fn();
      }
    );
  });

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

    vi.mocked(ticketService.subscribeToUserTickets).mockReset();
    vi.mocked(ticketService.subscribeToUserTickets)
      .mockImplementationOnce((_uid, onUpdate) => {
        onUpdate(ticketsA);
        return vi.fn();
      })
      .mockImplementationOnce((_uid, onUpdate) => {
        onUpdate(ticketsB);
        return vi.fn();
      });

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

    vi.mocked(ticketService.subscribeToUserTickets).mockImplementation(
      (_userId, onUpdate) => {
        onUpdate([]);
        return vi.fn();
      }
    );

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
      await result.current.createTicket({
        eventId: "e1",
        userId: "u1",
        userEmail: "u1@example.com",
        status: "active",
        price: 120,
        ticketType: "vip",
      });
    });
    expect(ticketService.createTicket).toHaveBeenCalled();
  });

  it("handle error in subscribeToUserTickets", async () => {
    const wrapper = wrapperWithAuth({
      user: { uid: "u1" } as any,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "token",
      getAuthHeaders: async () => ({}),
    });

    vi.mocked(ticketService.subscribeToUserTickets).mockImplementation(
      (_userId, _onUpdate, onError) => {
        onError(new Error("Subscription error"));
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useUserTickets(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe("Subscription error");
    expect(result.current.loading).toBe(false);
  });

  it("handle error with empty message in subscribeToUserTickets", async () => {
    const wrapper = wrapperWithAuth({
      user: { uid: "u1" } as any,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "token",
      getAuthHeaders: async () => ({}),
    });

    vi.mocked(ticketService.subscribeToUserTickets).mockImplementation(
      (_userId, _onUpdate, onError) => {
        onError(new Error("")); // Empty message
        return vi.fn();
      }
    );

    const { result } = renderHook(() => useUserTickets(), { wrapper });
    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.error).toBe("Erro ao carregar ingressos");
  });

  it("createTicket handles error", async () => {
    const wrapper = wrapperWithAuth({
      user: { uid: "u1" } as any,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "token",
      getAuthHeaders: async () => ({}),
    });

    vi.mocked(ticketService.createTicket).mockRejectedValue(
      new Error("Create error")
    );

    const { result } = renderHook(() => useUserTickets(), { wrapper });

    await act(async () => {
      try {
        await result.current.createTicket({} as any);
      } catch (e) {
        // Expected
      }
    });

    expect(result.current.error).toBe("Create error");
  });

  it("createTicket handles non-Error exception", async () => {
    const wrapper = wrapperWithAuth({
      user: { uid: "u1" } as any,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "token",
      getAuthHeaders: async () => ({}),
    });

    vi.mocked(ticketService.createTicket).mockRejectedValue("String Error");

    const { result } = renderHook(() => useUserTickets(), { wrapper });

    await act(async () => {
      try {
        await result.current.createTicket({} as any);
      } catch (e) {
        // Expected
      }
    });

    expect(result.current.error).toBe("Erro ao criar ingresso");
  });
});

describe("useTicketValidation", () => {
  it("valida ingresso com sucesso", async () => {
    const mockTicket: Ticket = {
      id: "t1",
      eventId: "e1",
      userId: "u1",
      userEmail: "u1@example.com",
      purchaseDate: new Date().toISOString(),
      qrCode: "qr1",
      status: "active",
      price: 100,
      ticketType: "standard",
    };

    (ticketService.getTicketForValidation as any).mockResolvedValue(mockTicket);

    const { result } = renderHook(() => useTicketValidation());

    let response;
    await act(async () => {
      response = await result.current.validateTicket("t1", "qr1");
    });

    expect(response).toEqual({
      success: true,
      ticket: mockTicket,
      message: "Ingresso válido!",
    });
    expect(result.current.error).toBeNull();
  });

  it("falha ao validar ingresso inexistente", async () => {
    (ticketService.getTicketForValidation as any).mockResolvedValue(null);

    const { result } = renderHook(() => useTicketValidation());

    let response;
    await act(async () => {
      response = await result.current.validateTicket("invalid", "qr");
    });

    expect(response).toEqual({
      success: false,
      message: "Ingresso não encontrado ou QR Code inválido",
    });

    expect(result.current.error).toBe(
      "Ingresso não encontrado ou QR Code inválido"
    );
  });

  it("falha ao validar ingresso usado", async () => {
    const mockTicket: Ticket = {
      id: "t1",
      eventId: "e1",
      userId: "u1",
      userEmail: "u1@example.com",
      purchaseDate: new Date().toISOString(),
      qrCode: "qr1",
      status: "used",
      price: 100,
      ticketType: "standard",
    };

    (ticketService.getTicketForValidation as any).mockResolvedValue(mockTicket);

    const { result } = renderHook(() => useTicketValidation());

    let response;
    await act(async () => {
      response = await result.current.validateTicket("t1", "qr1");
    });

    expect(response).toEqual({
      success: false,
      message: "Este ingresso já foi utilizado",
    });

    expect(result.current.error).toBe("Este ingresso já foi utilizado");
  });

  it("falha ao validar ingresso cancelado", async () => {
    const mockTicket: Ticket = {
      id: "t1",
      eventId: "e1",
      userId: "u1",
      userEmail: "u1@example.com",
      purchaseDate: new Date().toISOString(),
      qrCode: "qr1",
      status: "cancelled",
      price: 100,
      ticketType: "standard",
    };

    (ticketService.getTicketForValidation as any).mockResolvedValue(mockTicket);

    const { result } = renderHook(() => useTicketValidation());

    let response;
    await act(async () => {
      response = await result.current.validateTicket("t1", "qr1");
    });

    expect(response).toEqual({
      success: false,
      message: "Este ingresso foi cancelado",
    });

    expect(result.current.error).toBe("Este ingresso foi cancelado");
  });

  it("falha ao validar ingresso com erro desconhecido", async () => {
    (ticketService.getTicketForValidation as any).mockRejectedValue(
      "Unknown Error"
    );

    const { result } = renderHook(() => useTicketValidation());

    let response;
    await act(async () => {
      response = await result.current.validateTicket("t1", "qr1");
    });

    expect(response).toEqual({
      success: false,
      message: "Erro ao validar ingresso",
    });
    expect(result.current.error).toBe("Erro ao validar ingresso");
  });

  it("marca ingresso como usado com sucesso", async () => {
    (ticketService.markTicketAsUsed as any).mockResolvedValue(undefined);

    const { result } = renderHook(() => useTicketValidation());

    let response;
    await act(async () => {
      response = await result.current.markTicketAsUsed("t1", "validator1");
    });

    expect(ticketService.markTicketAsUsed).toHaveBeenCalledWith(
      "t1",
      "validator1"
    );
    expect(response).toEqual({
      success: true,
      message: "Ingresso marcado como usado com sucesso!",
    });
    expect(result.current.error).toBeNull();
  });

  it("falha ao marcar ingresso como usado", async () => {
    (ticketService.markTicketAsUsed as any).mockRejectedValue(
      new Error("Erro de conexão")
    );

    const { result } = renderHook(() => useTicketValidation());

    let response;
    await act(async () => {
      response = await result.current.markTicketAsUsed("t1", "validator1");
    });

    expect(response).toEqual({
      success: false,
      message: "Erro de conexão",
    });
    expect(result.current.error).toBe("Erro de conexão");
  });

  it("falha ao marcar ingresso como usado com erro desconhecido", async () => {
    (ticketService.markTicketAsUsed as any).mockRejectedValue(
      "Erro desconhecido"
    );

    const { result } = renderHook(() => useTicketValidation());

    let response;
    await act(async () => {
      response = await result.current.markTicketAsUsed("t1", "validator1");
    });

    expect(response).toEqual({
      success: false,
      message: "Erro ao marcar ingresso como usado",
    });
    expect(result.current.error).toBe("Erro ao marcar ingresso como usado");
  });
});
