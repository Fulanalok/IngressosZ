import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, AuthContextType } from "../context/authContext";
import HomePage from "./HomePage";

// Mock do EventCard
vi.mock("../components/EventCard", () => ({
  default: ({ event }: { event: { id: string; title: string } }) => (
    <div data-testid="featured-event-card">{event.title}</div>
  ),
}));

// Mock do useEvents
vi.mock("../hooks/useEvents", () => ({
  useEvents: () => ({
    events: [
      { id: "1", title: "Evento Destaque 1", date: "2024-01-01" },
      { id: "2", title: "Evento Destaque 2", date: "2024-01-02" },
      { id: "3", title: "Evento Destaque 3", date: "2024-01-03" },
      { id: "4", title: "Evento Extra", date: "2024-01-04" }, // Não deve aparecer
    ],
    loading: false,
    error: null,
  }),
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
          <HomePage />
        </BrowserRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("HomePage", () => {
  const mockUser: AuthContextType = {
    user: { uid: "u1" } as unknown as import("firebase/auth").User,
    userProfile: {
      uid: "u1",
      email: "test@example.com",
      displayName: "User",
      role: "user",
      createdAt: "",
    },
    loading: false,
    signOut: async () => {},
    getFreshIdToken: async () => null,
    getAuthHeaders: async () => ({}),
  };

  it("renderiza eventos em destaque (máximo 3)", () => {
    renderWithAuth(mockUser);
    
    // Verifica título da seção
    expect(screen.getByText("Eventos em Destaque")).toBeInTheDocument();
    
    // Verifica se renderizou apenas 3 eventos
    const cards = screen.getAllByTestId("featured-event-card");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("Evento Destaque 1")).toBeInTheDocument();
    expect(screen.queryByText("Evento Extra")).not.toBeInTheDocument();
  });

  it("renderiza seção 'Por que usar o IngressosZ'", () => {
    renderWithAuth(mockUser);
    expect(screen.getByText("Por que usar o IngressosZ?")).toBeInTheDocument();
    expect(screen.getByText("Segurança Total")).toBeInTheDocument();
  });
});
