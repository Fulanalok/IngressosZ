import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { BrowserRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, AuthContextType } from "@/context/auth/authContext";
import HomePage from "./HomePage";

// Mock do EventCard
vi.mock("../components/EventCard", () => ({
  default: ({ event }: { event: { id: string; title: string } }) => (
    <div data-testid="featured-event-card">{event.title}</div>
  ),
}));

// Mock do useEvents
vi.mock("@/hooks/event/useEvents", () => ({
  useEvents: () => ({
    data: [
      { id: "1", title: "Evento Destaque 1", date: "2024-01-01" },
      { id: "2", title: "Evento Destaque 2", date: "2024-01-02" },
      { id: "3", title: "Evento Destaque 3", date: "2024-01-03" },
      { id: "4", title: "Evento Extra", date: "2024-01-04" },
    ],
    status: "success",
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
      createdAt: Timestamp.fromDate(new Date("2024-01-01")),
    },
    loading: false,
    signOut: async () => {},
    getFreshIdToken: async () => null,
    getAuthHeaders: async () => ({}),
  };

  it("renderiza eventos em destaque (máximo 4)", () => {
    renderWithAuth(mockUser);

    expect(screen.getByText("Eventos em Destaque")).toBeInTheDocument();

    const cards = screen.getAllByTestId("featured-event-card");
    expect(cards).toHaveLength(4);
    // Usamos getAllByText e pegamos o primeiro pois o título do primeiro evento
    // também aparece no Hero Section como "Próximo destaque"
    expect(screen.getAllByText("Evento Destaque 1")[0]).toBeInTheDocument();
    expect(screen.getByText("Evento Extra")).toBeInTheDocument();
  });

  it("renderiza seção 'Por que usar o IngressosZ'", () => {
    renderWithAuth(mockUser);
    expect(screen.getByText(/Por que IngressosZ/)).toBeInTheDocument();
    expect(screen.getByText("Segurança Total")).toBeInTheDocument();
  });
});
