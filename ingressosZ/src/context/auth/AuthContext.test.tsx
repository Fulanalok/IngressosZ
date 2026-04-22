import { render, screen } from "@testing-library/react";
import React from "react";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/hooks/auth/useAuth";
import { AuthContext } from "./authContext";

vi.mock("../firebaseConfig", () => ({
  auth: { currentUser: null },
}));

// manter mocks mínimos

function Probe() {
  const { getAuthHeaders } = useAuth();
  const [state, setState] = React.useState<Record<string, string> | null>(null);
  React.useEffect(() => {
    getAuthHeaders().then(setState);
  }, [getAuthHeaders]);
  return <div data-testid="out">{state ? JSON.stringify(state) : ""}</div>;
}

describe("AuthContext", () => {
  it("retorna headers vazios sem usuário", async () => {
    const value = {
      user: null,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => null,
      getAuthHeaders: async () => ({} as Record<string, string>),
    };
    render(
      <AuthContext.Provider value={value}>
        <Probe />
      </AuthContext.Provider>
    );
    const el = await screen.findByTestId("out");
    expect(el.textContent).toBe("{}");
  });

  it("retorna Authorization quando há token", async () => {
    const value = {
      user: { uid: "u1" } as unknown as import("firebase/auth").User,
      userProfile: null,
      loading: false,
      signOut: async () => {},
      getFreshIdToken: async () => "t-abc",
      getAuthHeaders: async () =>
        ({ Authorization: "Bearer t-abc" } as Record<string, string>),
    };
    render(
      <AuthContext.Provider value={value}>
        <Probe />
      </AuthContext.Provider>
    );
    const el = await screen.findByTestId("out");
    expect(el.textContent).toContain("Authorization");
  });
});
