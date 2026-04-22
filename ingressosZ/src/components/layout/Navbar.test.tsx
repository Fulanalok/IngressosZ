import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import Navbar from "./Navbar";

vi.mock("../hooks/useAuth");

vi.mock("./ThemeToggle", () => ({
  default: () => <button aria-label="Toggle theme" />,
}));

const mockSignOut = vi.fn();

const baseProfile = {
  uid: "u1",
  email: "user@example.com",
  displayName: "Usuário Teste",
  role: "user",
};

function renderNavbar(initialPath = "/") {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Navbar />
    </MemoryRouter>
  );
}

describe("Navbar Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ userProfile: baseProfile, signOut: mockSignOut });
  });

  it("exibe logo IngressosZ", () => {
    renderNavbar();
    expect(screen.getByText("IngressosZ")).toBeInTheDocument();
  });

  it("exibe links de navegação padrão", () => {
    renderNavbar();
    expect(screen.getByText("Início")).toBeInTheDocument();
    expect(screen.getByText("Eventos")).toBeInTheDocument();
    expect(screen.getByText("Meus ingressos")).toBeInTheDocument();
  });

  it("não exibe 'Painel Admin' para role user", () => {
    renderNavbar();
    expect(screen.queryByText("Painel Admin")).not.toBeInTheDocument();
  });

  it("exibe 'Painel Admin' para role organizer", () => {
    (useAuth as any).mockReturnValue({
      userProfile: { ...baseProfile, role: "organizer" },
      signOut: mockSignOut,
    });
    renderNavbar();
    expect(screen.getByText("Painel Admin")).toBeInTheDocument();
  });

  it("exibe link Validador para role organizer", () => {
    (useAuth as any).mockReturnValue({
      userProfile: { ...baseProfile, role: "organizer" },
      signOut: mockSignOut,
    });
    renderNavbar();
    expect(screen.getByText("Validador")).toBeInTheDocument();
  });

  it("exibe link Validador para role validator", () => {
    (useAuth as any).mockReturnValue({
      userProfile: { ...baseProfile, role: "validator" },
      signOut: mockSignOut,
    });
    renderNavbar();
    expect(screen.getByText("Validador")).toBeInTheDocument();
  });

  it("não exibe link Validador para role user", () => {
    renderNavbar();
    expect(screen.queryByText("Validador")).not.toBeInTheDocument();
  });

  it("exibe nome do usuário logado na saudação", () => {
    renderNavbar();
    // "Olá," e o nome ficam em spans separados
    expect(screen.getByText("Olá,")).toBeInTheDocument();
    expect(screen.getByText("Usuário Teste")).toBeInTheDocument();
  });

  it("exibe parte local do email quando displayName não está definido", () => {
    (useAuth as any).mockReturnValue({
      userProfile: { ...baseProfile, displayName: undefined },
      signOut: mockSignOut,
    });
    renderNavbar();
    // email.split('@')[0] → "user"
    expect(screen.getByText("user")).toBeInTheDocument();
  });

  it("exibe botão Sair quando usuário está logado", () => {
    renderNavbar();
    expect(screen.getByText("Sair")).toBeInTheDocument();
  });

  it("chama signOut ao clicar em Sair", () => {
    renderNavbar();
    fireEvent.click(screen.getByText("Sair"));
    expect(mockSignOut).toHaveBeenCalled();
  });

  it("não exibe saudação e botão Sair quando não está logado", () => {
    (useAuth as any).mockReturnValue({ userProfile: null, signOut: mockSignOut });
    renderNavbar();
    expect(screen.queryByText(/Olá,/)).not.toBeInTheDocument();
    expect(screen.queryByText("Sair")).not.toBeInTheDocument();
  });
});
