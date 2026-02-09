import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextType } from "../context/authContext";
import MyTicketsPage from "./MyTicketsPage";

// Mock do hook useUserTickets
vi.mock("../hooks/useTickets", () => ({
  useUserTickets: vi.fn(),
}));

import { useUserTickets } from "../hooks/useTickets";

// Mock do componente Ticket
vi.mock("../components/Ticket", () => ({
  default: ({ ticket }: { ticket: { eventTitle: string } }) => (
    <div data-testid="ticket-card">{ticket.eventTitle}</div>
  ),
}));

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
}

function renderWithAuth(value: AuthContextType) {
  const client = createClient();
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={value}>
        <BrowserRouter>
          <MyTicketsPage />
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("MyTicketsPage", () => {
  const mockUser: AuthContextType = {
    user: { uid: "u1", email: "user@example.com" } as unknown as import("firebase/auth").User,
    userProfile: {
      uid: "u1",
      email: "user@example.com",
      displayName: "User",
      role: "user",
      createdAt: "",
    },
    loading: false,
    signOut: async () => {},
    getFreshIdToken: async () => null,
    getAuthHeaders: async () => ({}),
  };

  it("renderiza estado de carregamento", () => {
    (useUserTickets as any).mockReturnValue({
      tickets: [],
      loading: true,
      error: null,
    });

    renderWithAuth(mockUser);
    expect(screen.getByText("Carregando seus ingressos...")).toBeInTheDocument();
  });

  it("renderiza estado vazio", () => {
    (useUserTickets as any).mockReturnValue({
      tickets: [],
      loading: false,
      error: null,
    });

    renderWithAuth(mockUser);
    expect(screen.getByText("Você ainda não possui ingressos")).toBeInTheDocument();
    expect(screen.getByText("Descobrir Eventos")).toBeInTheDocument();
  });

  it("renderiza lista de ingressos", () => {
    const mockTickets = [
      { id: "1", eventTitle: "Show de Rock", status: "active" },
      { id: "2", eventTitle: "Teatro", status: "used" },
    ];

    (useUserTickets as any).mockReturnValue({
      tickets: mockTickets,
      loading: false,
      error: null,
    });

    renderWithAuth(mockUser);
    expect(screen.getByText("Seus Ingressos (2)")).toBeInTheDocument();
    expect(screen.getAllByTestId("ticket-card")).toHaveLength(2);
    expect(screen.getByText("Show de Rock")).toBeInTheDocument();
    expect(screen.getByText("Teatro")).toBeInTheDocument();
  });

  it("renderiza estado de erro", () => {
    (useUserTickets as any).mockReturnValue({
      tickets: [],
      loading: false,
      error: "Erro de conexão",
    });

    renderWithAuth(mockUser);
    expect(screen.getByText("Erro ao carregar ingressos")).toBeInTheDocument();
    expect(screen.getByText("Erro de conexão")).toBeInTheDocument();
  });
});
