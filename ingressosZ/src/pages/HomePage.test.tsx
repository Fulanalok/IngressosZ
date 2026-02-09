import { useQueryClient } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { HelmetProvider } from "react-helmet-async";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { useAuth } from "../hooks/useAuth";
import { useEvents } from "../hooks/useEvents";
import HomePage from "./HomePage";

// Mock dependencies
vi.mock("../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

vi.mock("../hooks/useEvents", () => ({
  useEvents: vi.fn(),
}));

vi.mock("@tanstack/react-query", () => ({
  useQueryClient: vi.fn(),
}));

// Mock child components to simplify testing
vi.mock("../components/EventCard", () => ({
  default: ({ event }: { event: any }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
}));

describe("HomePage", () => {
  const mockEvents = [
    { id: "1", title: "Event 1", date: new Date().toISOString() },
    { id: "2", title: "Event 2", date: new Date().toISOString() },
    { id: "3", title: "Event 3", date: new Date().toISOString() },
    { id: "4", title: "Event 4", date: new Date().toISOString() },
  ];

  const mockPrefetchQuery = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({ userProfile: null });
    (useEvents as any).mockReturnValue({ events: mockEvents, loading: false });
    (useQueryClient as any).mockReturnValue({
      prefetchQuery: mockPrefetchQuery,
    });
  });

  const renderWithProviders = (ui: React.ReactNode) => {
    return render(
      <HelmetProvider>
        <MemoryRouter>{ui}</MemoryRouter>
      </HelmetProvider>
    );
  };

  it("renders hero section", () => {
    renderWithProviders(<HomePage />);
    expect(screen.getByText(/Bem-vindo ao IngressosZ/i)).toBeInTheDocument();
    expect(screen.getByText(/Explorar Eventos/i)).toBeInTheDocument();
  });

  it("renders featured events (top 3)", () => {
    renderWithProviders(<HomePage />);
    const cards = screen.getAllByTestId("event-card");
    expect(cards).toHaveLength(3);
    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 3")).toBeInTheDocument();
    expect(screen.queryByText("Event 4")).not.toBeInTheDocument();
  });

  it("prefetches events on hover/focus of explore button", () => {
    renderWithProviders(<HomePage />);
    const exploreButton = screen.getByText(/Explorar Eventos/i);
    fireEvent.mouseEnter(exploreButton);
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["events"] })
    );

    mockPrefetchQuery.mockClear();
    fireEvent.focus(exploreButton);
    expect(mockPrefetchQuery).toHaveBeenCalledWith(
      expect.objectContaining({ queryKey: ["events"] })
    );
  });

  it("shows loading spinner when loading events", () => {
    (useEvents as any).mockReturnValue({ events: mockEvents, loading: true });
    renderWithProviders(<HomePage />);
    const spinner = document.querySelector(".animate-spin");
    expect(spinner).toBeInTheDocument();
  });

  it("renders admin access for organizer", () => {
    (useAuth as any).mockReturnValue({
      userProfile: { role: "organizer" },
    });
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Acesso Rápido")).toBeInTheDocument();
    expect(screen.getByText("Painel Administrativo")).toBeInTheDocument();
    expect(screen.getByText("Validador de Ingressos")).toBeInTheDocument();
  });

  it("renders validator access for validator", () => {
    (useAuth as any).mockReturnValue({
      userProfile: { role: "validator" },
    });
    renderWithProviders(<HomePage />);
    expect(screen.getByText("Acesso Rápido")).toBeInTheDocument();
    expect(screen.queryByText("Painel Administrativo")).not.toBeInTheDocument();
    expect(screen.getByText("Validador de Ingressos")).toBeInTheDocument();
  });

  it("does not render quick access for regular user", () => {
    (useAuth as any).mockReturnValue({
      userProfile: { role: "user" },
    });
    renderWithProviders(<HomePage />);
    expect(screen.queryByText("Acesso Rápido")).not.toBeInTheDocument();
  });
});
