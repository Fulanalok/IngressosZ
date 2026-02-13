import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { AuthContextType } from "../context/authContext";
import { AuthContext } from "../context/authContext";
import EventsPage from "./EventsPage";

vi.mock("../hooks/useEvents", () => {
  const events = Array.from({ length: 25 }).map((_, i) => ({
    id: `e${i}`,
    title: `Evento ${i}`,
    location: `Local ${i}`,
    category: i % 2 === 0 ? "Música" : "Tecnologia",
    date: new Date().toISOString(),
    time: "19:00",
    price: 50,
    availableTickets: 20,
    maxTickets: 100,
    image: "",
  }));
  return {
    useEvents: () => ({
      events,
      loading: false,
      error: null,
      refetch: vi.fn(),
    }),
  };
});

vi.mock("../components/EventCard", () => ({
  default: ({ event }: { event: { id: string; title: string } }) => (
    <div data-testid="event-card">{event.title}</div>
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
        <EventsPage />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("EventsPage", () => {
  it("ativa virtualização com muitos eventos e filtra por busca", async () => {
    const value: AuthContextType = {
      user: { uid: "u1" } as unknown as import("firebase/auth").User,
      userProfile: {
        uid: "u1",
        email: "e@e.com",
        displayName: "U",
        role: "user",
        createdAt: "",
      },
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => null,
      getAuthHeaders: async () => ({}),
    };
    renderWithAuth(value);
    expect(await screen.findByText(/Eventos Disponíveis/)).toBeInTheDocument();
    expect(screen.getAllByTestId("event-card").length > 0).toBe(true);
    const input = screen.getByPlaceholderText(/Buscar eventos/);
    fireEvent.change(input as HTMLInputElement, {
      target: { value: "Evento 1" },
    });
    expect(await screen.findByText(/Resultados/)).toBeInTheDocument();
  });
});
