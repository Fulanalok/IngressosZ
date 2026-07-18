import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import "@testing-library/jest-dom/vitest";
import { render, screen } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { BrowserRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { AuthContext, type AuthContextType } from "@/context/auth/authContext";
import HomePage from "./HomePage";

vi.mock("@/components/event/EventCard", () => ({
  default: ({ event }: { event: { id: string; title: string } }) => (
    <div data-testid="featured-event-card">{event.title}</div>
  ),
}));

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

  it("renderiza próximos eventos (máximo 4)", () => {
    renderWithAuth(mockUser);

    expect(screen.getByText("Próximos eventos")).toBeInTheDocument();
    expect(screen.getAllByTestId("featured-event-card")).toHaveLength(4);
    expect(screen.getByText("Evento Destaque 1")).toBeInTheDocument();
    expect(screen.getByText("Evento Extra")).toBeInTheDocument();
  });

  it("nao renderiza a secao promocional da home", () => {
    renderWithAuth(mockUser);
    expect(screen.queryByText(/Por que IngressosZ/)).not.toBeInTheDocument();
    expect(screen.queryByText("Segurança Total")).not.toBeInTheDocument();
  });

  it.each([
    ["user", false, false],
    ["organizer", true, true],
    ["validator", false, true],
    ["admin", true, true],
  ] as const)(
    "renderiza atalhos corretos para role %s",
    (role, seesAdmin, seesValidator) => {
      renderWithAuth({
        ...mockUser,
        userProfile: { ...mockUser.userProfile!, role },
      });

      expect(Boolean(screen.queryByText("Painel Administrativo"))).toBe(
        seesAdmin
      );
      expect(Boolean(screen.queryByText("Validador de Ingressos"))).toBe(
        seesValidator
      );
      if (role === "user") {
        expect(screen.queryByText("Acesso rápido")).not.toBeInTheDocument();
      }
    }
  );
});
