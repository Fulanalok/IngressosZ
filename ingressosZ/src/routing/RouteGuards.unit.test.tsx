import { AuthContext, type AuthContextType } from "@/context/auth/authContext";
import type { UserProfile } from "@/types";
import { render, screen } from "@testing-library/react";
import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { MemoryRouter, Route, Routes } from "react-router";
import { describe, expect, it } from "vitest";
import { RequireAuth } from "./RequireAuth";
import { RequireRole } from "./RequireRole";

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

function profile(role: UserProfile["role"]): UserProfile {
  return {
    uid: "u1",
    email: "u@example.com",
    displayName: "User",
    role,
    createdAt: Timestamp.fromDate(new Date("2020-01-01T00:00:00Z")),
  };
}

function renderWithAuth(
  initialPath: string,
  value: AuthContextType,
  element: React.ReactNode
) {
  return render(
    <AuthContext.Provider value={value}>
      <MemoryRouter initialEntries={[initialPath]}>
        <Routes>
          <Route path="/login" element={<div>Login Page</div>} />
          <Route path="/" element={<div>Home Page</div>} />
          <Route path="/protected" element={element} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>
  );
}

describe("Route guards", () => {
  it("redireciona usuario anonimo para login", async () => {
    renderWithAuth(
      "/protected",
      baseValue({ user: null, userProfile: null }),
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(await screen.findByText("Login Page")).toBeInTheDocument();
  });

  it("renderiza conteudo autenticado", async () => {
    renderWithAuth(
      "/protected",
      baseValue({
        user: { uid: "u1" } as unknown as User,
        userProfile: profile("user"),
      }),
      <RequireAuth>
        <div>Protected Content</div>
      </RequireAuth>
    );

    expect(await screen.findByText("Protected Content")).toBeInTheDocument();
  });

  it("permite role autorizada", async () => {
    renderWithAuth(
      "/protected",
      baseValue({
        user: { uid: "v1" } as unknown as User,
        userProfile: profile("validator"),
      }),
      <RequireRole role={["validator", "admin"]}>
        <div>Role Content</div>
      </RequireRole>
    );

    expect(await screen.findByText("Role Content")).toBeInTheDocument();
  });

  it("mostra aviso em dev para role sem permissao", async () => {
    renderWithAuth(
      "/protected",
      baseValue({
        user: { uid: "u1" } as unknown as User,
        userProfile: profile("user"),
      }),
      <RequireRole role="admin">
        <div>Role Content</div>
      </RequireRole>
    );

    expect(await screen.findByText("Acesso Restrito (DEV Mode)"))
      .toBeInTheDocument();
    expect(screen.queryByText("Role Content")).not.toBeInTheDocument();
  });
});
