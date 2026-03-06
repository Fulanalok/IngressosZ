import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { expect, test, vi } from "vitest";
import App from "../App";
import { AuthContext, type AuthContextType } from "../context/authContext";
import type { UserProfile } from "../types";

function createClient() {
  return new QueryClient({
    defaultOptions: { queries: { retry: 0 } },
  });
}

vi.mock("@/pages/Login", () => ({
  default: () => <div>Bem-vindo de volta!</div>,
}));
vi.mock("@/pages/HomePage", () => ({
  default: () => <div>Explorar Eventos</div>,
}));
vi.mock("@/pages/EventsPage", () => ({
  default: () => <div>Lista de Eventos</div>,
}));
vi.mock("@/pages/ValidatorPage", () => ({
  default: () => <div>Resultado da Validação</div>,
}));

function renderWithAuth(path: string, value: AuthContextType) {
  const client = createClient();
  window.history.pushState({}, "", path);
  return render(
    <QueryClientProvider client={client}>
      <AuthContext.Provider value={value}>
        <App />
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

function baseValue(partial: Partial<AuthContextType>): AuthContextType {
  return {
    user: null,
    userProfile: null,
    loading: false,
    signOut: async () => {},
    getFreshIdToken: async () => null,
    getAuthHeaders: async () => ({}),
    ...partial,
  };
}

test("permite acesso público a /eventos", async () => {
  renderWithAuth("/eventos", baseValue({ user: null, userProfile: null }));
  await screen.findByText("Lista de Eventos");
  expect(window.location.pathname).toBe("/eventos");
});

test("bloqueia acesso a /validador sem papel validator", async () => {
  const user = { uid: "u1" } as unknown as User;
  const profile: UserProfile = {
    uid: "u1",
    email: "u@e.com",
    displayName: "User",
    role: "user",
    createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
  };
  renderWithAuth("/validador", baseValue({ user, userProfile: profile }));
  await screen.findByText("Acesso Restrito (DEV Mode)");
  expect(window.location.pathname).toBe("/validador");
});

test("permite acesso a /validador com papel validator", async () => {
  const user = { uid: "v1" } as unknown as User;
  const profile: UserProfile = {
    uid: "v1",
    email: "v@e.com",
    displayName: "Validador",
    role: "validator",
    createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
  };
  renderWithAuth("/validador", baseValue({ user, userProfile: profile }));
  await screen.findByText("Resultado da Validação");
  expect(window.location.pathname).toBe("/validador");
});
