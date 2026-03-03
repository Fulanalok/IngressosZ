import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ProfilePage from "./ProfilePage";

const { mockToast } = vi.hoisted(() => {
  return {
    mockToast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

const { authState } = vi.hoisted(() => ({
  authState: {
    userProfile: null as any,
    signOut: vi.fn(),
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("react-hot-toast", () => ({
  toast: mockToast,
}));

describe("ProfilePage", () => {
  const mockUser = {
    uid: "user123",
    displayName: "Test User",
    email: "test@example.com",
    role: "user",
    createdAt: { seconds: 1672531200 },
  };

  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    authState.userProfile = mockUser;
    authState.signOut = mockSignOut;
  });

  it("renders user profile information", () => {
    const expectedDate = new Date(
      mockUser.createdAt.seconds * 1000
    ).toLocaleDateString("pt-BR");
    render(<ProfilePage />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("user123")).toBeInTheDocument();
    expect(screen.getByText(expectedDate)).toBeInTheDocument();
  });

  it("handles logout", async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Sair da Conta"));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("handles logout error", async () => {
    (mockSignOut as any).mockRejectedValue(new Error("Logout failed"));
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Sair da Conta"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Erro ao sair da conta");
    });
  });

  it("renders with default values when userProfile is null", () => {
    authState.userProfile = null;
    render(<ProfilePage />);
    expect(screen.getByText("Usuário")).toBeInTheDocument();
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });
});
