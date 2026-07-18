import { act, render, screen, waitFor } from "@testing-library/react";
import type { User } from "firebase/auth";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "@/hooks/auth/useAuth";
import { AuthProvider } from "./AuthProvider";

const authMocks = vi.hoisted(() => ({
  listener: null as ((user: User | null) => Promise<void>) | null,
  getUserProfile: vi.fn(),
  createUserProfile: vi.fn(),
}));

vi.mock("@/firebaseConfig", () => ({ auth: {} }));

vi.mock("firebase/auth", () => ({
  getRedirectResult: vi.fn().mockResolvedValue(null),
  onIdTokenChanged: vi.fn(
    (_auth: unknown, listener: (user: User | null) => Promise<void>) => {
      authMocks.listener = listener;
      return vi.fn();
    }
  ),
  signOut: vi.fn().mockResolvedValue(undefined),
}));

vi.mock("@/services/firestore", () => ({
  userService: {
    getUserProfile: authMocks.getUserProfile,
    createUserProfile: authMocks.createUserProfile,
  },
}));

vi.mock("@/services/logger", () => ({
  logger: { error: vi.fn() },
}));

function RoleProbe() {
  const { userProfile } = useAuth();
  return <div data-testid="role">{userProfile?.role ?? "none"}</div>;
}

describe("AuthProvider", () => {
  it("atualiza a role quando o ID token muda", async () => {
    let claimRole = "organizer";
    const user = {
      uid: "user-a",
      email: "user@example.com",
      displayName: "User",
      phoneNumber: null,
      photoURL: null,
      getIdTokenResult: vi.fn(async () => ({
        claims: { role: claimRole },
      })),
    } as unknown as User;
    authMocks.getUserProfile.mockResolvedValue({
      uid: "user-a",
      email: "user@example.com",
      displayName: "User",
      role: "user",
      createdAt: {},
    });

    render(
      <AuthProvider>
        <RoleProbe />
      </AuthProvider>
    );

    await act(async () => {
      await authMocks.listener?.(user);
    });
    expect(screen.getByTestId("role")).toHaveTextContent("organizer");

    claimRole = "admin";
    await act(async () => {
      await authMocks.listener?.(user);
    });

    await waitFor(() => {
      expect(screen.getByTestId("role")).toHaveTextContent("admin");
    });
  });
});
