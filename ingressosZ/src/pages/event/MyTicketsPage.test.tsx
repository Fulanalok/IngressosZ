import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { User } from "firebase/auth";
import { BrowserRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextType } from "@/context/auth/authContext";
import { useUserTickets } from "@/hooks/event/useTickets";
import MyTicketsPage from "./MyTicketsPage";

vi.mock("@/hooks/event/useTickets", () => ({
  useUserTickets: vi.fn(),
}));

vi.mock("@/components/ticket/Ticket", () => ({
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
    user: { uid: "u1", email: "user@example.com" } as User,
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
    vi.mocked(useUserTickets).mockReturnValue({
      tickets: [],
      isLoading: true,
      error: null,
    });

    renderWithAuth(mockUser);
    expect(document.querySelectorAll(".animate-pulse").length).toBeGreaterThan(0);
  });

  it("renderiza estado vazio", () => {
    vi.mocked(useUserTickets).mockReturnValue({
      tickets: [],
      isLoading: false,
      error: null,
    });

    renderWithAuth(mockUser);
    expect(screen.getByText(/Sua carteira/)).toBeInTheDocument();
    expect(screen.getByText(/não possui ingressos/)).toBeInTheDocument();
    expect(screen.getByText("Explorar eventos")).toBeInTheDocument();
  });

  it("renderiza lista de ingressos", () => {
    const mockTickets = [
      { id: "1", eventTitle: "Show de Rock", status: "valid" },
      { id: "2", eventTitle: "Teatro", status: "used" },
    ];

    vi.mocked(useUserTickets).mockReturnValue({
      tickets: mockTickets as never,
      isLoading: false,
      error: null,
    });

    renderWithAuth(mockUser);
    expect(screen.getByText("Seus ingressos")).toBeInTheDocument();
    expect(screen.getByText("(2)")).toBeInTheDocument();
    expect(screen.getAllByTestId("ticket-card")).toHaveLength(2);
    expect(screen.getByText("Show de Rock")).toBeInTheDocument();
    expect(screen.getByText("Teatro")).toBeInTheDocument();
  });

  it("renderiza estado de erro", () => {
    vi.mocked(useUserTickets).mockReturnValue({
      tickets: [],
      isLoading: false,
      error: new Error("Erro de conexão"),
    });

    renderWithAuth(mockUser);
    expect(screen.getByText("Erro ao sincronizar")).toBeInTheDocument();
    expect(screen.getByText("Erro de conexão")).toBeInTheDocument();
  });
});
