import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { updateProfile } from "firebase/auth";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { userService } from "../services/firestore";
import { storageService } from "../services/storage";
import ProfilePage from "./ProfilePage";

const { mockToast } = vi.hoisted(() => {
  return {
    mockToast: {
      success: vi.fn(),
      error: vi.fn(),
    },
  };
});

// Mock dependencies
vi.mock("firebase/auth", () => ({
  updateProfile: vi.fn(),
}));

vi.mock("../firebaseConfig", () => ({
  auth: {
    currentUser: {
      photoURL: "old-photo.jpg",
    },
  },
}));

vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../services/firestore", () => ({
  userService: {
    updateUserProfile: vi.fn(),
  },
}));

vi.mock("../services/storage", () => ({
  storageService: {
    uploadUserAvatar: vi.fn(),
  },
}));

vi.mock("react-hot-toast", () => ({
  toast: mockToast,
}));

// Mock window.location.reload
const originalLocation = window.location;
const mockReload = vi.fn();

describe("ProfilePage", () => {
  const mockUser = {
    uid: "user123",
    displayName: "Test User",
    email: "test@example.com",
    phone: "123456789",
    role: "user",
    createdAt: new Date("2023-01-01").getTime(),
    photoURL: "http://example.com/photo.jpg",
  };

  const mockSignOut = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      userProfile: mockUser,
      signOut: mockSignOut,
    });

    // Setup window.location mock
    Object.defineProperty(window, "location", {
      configurable: true,
      value: { ...originalLocation, reload: mockReload },
    });
  });

  afterEach(() => {
    Object.defineProperty(window, "location", {
      configurable: true,
      value: originalLocation,
    });
  });

  it("renders user profile information", () => {
    render(<ProfilePage />);
    expect(screen.getByText("Test User")).toBeInTheDocument();
    expect(screen.getByText("test@example.com")).toBeInTheDocument();
    expect(screen.getByText("user123")).toBeInTheDocument();
    expect(screen.getByText("123456789")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: /avatar/i })).toHaveAttribute(
      "src",
      "old-photo.jpg"
    );
  });

  it("handles logout", async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Sair da Conta"));
    await waitFor(() => {
      expect(mockSignOut).toHaveBeenCalled();
    });
  });

  it("enters edit mode and updates profile", async () => {
    render(<ProfilePage />);

    // Enter edit mode
    fireEvent.click(screen.getByText("Editar Perfil"));
    expect(screen.getByDisplayValue("Test User")).toBeInTheDocument();
    expect(screen.getByDisplayValue("123456789")).toBeInTheDocument();

    // Change values
    fireEvent.change(screen.getByDisplayValue("Test User"), {
      target: { value: "Updated Name" },
    });
    fireEvent.change(screen.getByDisplayValue("123456789"), {
      target: { value: "987654321" },
    });

    // Save
    fireEvent.click(screen.getByText("Salvar Alterações"));

    await waitFor(() => {
      expect(updateProfile).toHaveBeenCalledWith(expect.anything(), {
        displayName: "Updated Name",
        photoURL: "old-photo.jpg",
      });
      expect(userService.updateUserProfile).toHaveBeenCalledWith("user123", {
        displayName: "Updated Name",
        photoURL: "old-photo.jpg",
        phone: "987654321",
      });
      expect(mockReload).toHaveBeenCalled();
    });
  });

  it("handles photo upload", async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Editar Perfil"));

    const file = new File(["(⌐□_□)"], "chucknorris.png", { type: "image/png" });
    const input = document.querySelector(
      'input[type="file"]'
    ) as HTMLInputElement;

    // Simulate clicking the "Alterar" button to trigger file input
    const changePhotoButton = screen.getByTitle("Alterar foto");
    fireEvent.click(changePhotoButton);
    expect(input).toBeInTheDocument();

    // Simulate file selection
    Object.defineProperty(input, "files", {
      value: [file],
    });
    fireEvent.change(input);

    (storageService.uploadUserAvatar as any).mockResolvedValue("new-photo-url");

    fireEvent.click(screen.getByText("Salvar Alterações"));

    await waitFor(() => {
      expect(storageService.uploadUserAvatar).toHaveBeenCalledWith(
        "user123",
        file
      );
      expect(updateProfile).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({
          photoURL: "new-photo-url",
        })
      );
    });
  });

  it("cancels edit mode", () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Editar Perfil"));
    expect(screen.getByText("Cancelar")).toBeInTheDocument();

    fireEvent.click(screen.getByText("Cancelar"));
    expect(screen.getByText("Editar Perfil")).toBeInTheDocument();
    expect(screen.queryByDisplayValue("Test User")).not.toBeInTheDocument();
  });

  it("handles logout error", async () => {
    (mockSignOut as any).mockRejectedValue(new Error("Logout failed"));
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Sair da Conta"));
    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Erro ao sair da conta");
    });
  });

  it("handles save error", async () => {
    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Editar Perfil"));
    (updateProfile as any).mockRejectedValue(new Error("Update failed"));

    fireEvent.click(screen.getByText("Salvar Alterações"));

    await waitFor(() => {
      expect(mockToast.error).toHaveBeenCalledWith("Erro ao atualizar perfil.");
    });
  });

  it("renders with default values when userProfile is null", () => {
    (useAuth as any).mockReturnValue({
      userProfile: null,
      signOut: mockSignOut,
    });
    render(<ProfilePage />);
    expect(screen.getByText("Usuário")).toBeInTheDocument();
    expect(screen.queryByText("Test User")).not.toBeInTheDocument();
  });

  it("does not save if currentUser is missing", async () => {
    // This is tricky because if currentUser is missing, usually useAuth handles it,
    // but here we check auth.currentUser directly in handleSave.
    // We mocked firebaseConfig auth.currentUser.
    // Let's mock it to null for this test.

    // We need to re-mock or use a spy if possible, but vi.mock is hoisted.
    // However, the component imports 'auth' from firebaseConfig.
    // We can't easily change the import mock per test unless we use doMock and dynamic imports,
    // or if the mock returns a mutable object.

    // The mock is:
    // vi.mock("../firebaseConfig", () => ({
    //   auth: {
    //     currentUser: {
    //       photoURL: "old-photo.jpg",
    //     },
    //   },
    // }));

    // This returns a static object. I can't change it easily.
    // But I can try to modify the property if it's writable.
    const { auth } = await import("../firebaseConfig");
    const originalUser = auth.currentUser;
    // @ts-ignore
    auth.currentUser = null;

    render(<ProfilePage />);
    fireEvent.click(screen.getByText("Editar Perfil"));
    fireEvent.click(screen.getByText("Salvar Alterações"));

    await waitFor(() => {
      expect(updateProfile).not.toHaveBeenCalled();
    });

    // Restore
    // @ts-ignore
    auth.currentUser = originalUser;
  });
});
