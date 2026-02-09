import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import EventsPage from "./EventsPage";
import { HelmetProvider } from "react-helmet-async";
import { BrowserRouter } from "react-router-dom";
import * as useEventsHook from "../hooks/useEvents";
import * as useAuthHook from "../hooks/useAuth";

// Mock dependencies
vi.mock("../hooks/useEvents");
vi.mock("../hooks/useAuth");
vi.mock("../components/common/SEO", () => ({
  SEO: () => <div data-testid="seo-mock" />,
}));
vi.mock("../components/EventCard", () => ({
  __esModule: true,
  default: ({ event }: any) => (
    <div data-testid="event-card">{event.title}</div>
  ),
  EventCardSkeleton: () => <div data-testid="event-card-skeleton" />,
}));

// Mock useInView
const mockUseInView = vi.fn();
vi.mock("react-intersection-observer", () => ({
  useInView: () => mockUseInView(),
}));

describe("EventsPage", () => {
  const mockEvents = [
    {
      id: "1",
      title: "Evento Teste 1",
      category: "Show",
      location: "São Paulo",
      price: 100,
      date: new Date().toISOString(),
      imageUrl: "url1",
    },
    {
      id: "2",
      title: "Outro Evento",
      category: "Teatro",
      location: "Rio de Janeiro",
      price: 50,
      date: new Date().toISOString(),
      imageUrl: "url2",
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuthHook.useAuth as any).mockReturnValue({
      userProfile: { displayName: "User Test" },
    });
    mockUseInView.mockReturnValue({ ref: vi.fn(), inView: false });
  });

  const renderComponent = () => {
    return render(
      <HelmetProvider>
        <BrowserRouter>
          <EventsPage />
        </BrowserRouter>
      </HelmetProvider>
    );
  };

  it("renders loading skeletons when loading", () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: [],
      loading: true,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderComponent();
    expect(screen.getAllByTestId("event-card-skeleton")).toHaveLength(8);
  });

  it("renders error state", () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: [],
      loading: false,
      error: "Erro de conexão",
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderComponent();
    expect(screen.getByText("Erro ao carregar eventos")).toBeInTheDocument();
    expect(screen.getByText("Erro de conexão")).toBeInTheDocument();
  });

  it("renders events list", () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    renderComponent();
    expect(screen.getByText("Evento Teste 1")).toBeInTheDocument();
    expect(screen.getByText("Outro Evento")).toBeInTheDocument();
  });

  it("filters events by search term", async () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderComponent();
    const searchInput = screen.getByPlaceholderText("Buscar por nome...");
    fireEvent.change(searchInput, { target: { value: "Teste" } });

    // Wait for debounce
    await waitFor(() => {
      expect(screen.getByText("Evento Teste 1")).toBeInTheDocument();
      expect(screen.queryByText("Outro Evento")).not.toBeInTheDocument();
    });
  });

  it("filters events by category", () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderComponent();
    // Use getAllByRole because there might be multiple selects or different structure
    // But here we can use getByDisplayValue if we assume "Todos" is default
    const selects = screen.getAllByRole("combobox");
    const categorySelect = selects[1]; // Assuming second select is category

    fireEvent.change(categorySelect, { target: { value: "Teatro" } });

    expect(screen.getByText("Outro Evento")).toBeInTheDocument();
    expect(screen.queryByText("Evento Teste 1")).not.toBeInTheDocument();
  });

  it("filters events by location", () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderComponent();
    const selects = screen.getAllByRole("combobox");
    const locationSelect = selects[0]; // Assuming first select is location

    fireEvent.change(locationSelect, { target: { value: "Rio de Janeiro" } });

    expect(screen.getByText("Outro Evento")).toBeInTheDocument();
    expect(screen.queryByText("Evento Teste 1")).not.toBeInTheDocument();
  });

  it("filters events by max price", () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderComponent();
    const priceInput = screen.getByPlaceholderText("Preço máximo (R$)");
    fireEvent.change(priceInput, { target: { value: "80" } });

    expect(screen.getByText("Outro Evento")).toBeInTheDocument();
    expect(screen.queryByText("Evento Teste 1")).not.toBeInTheDocument();
  });

  it("triggers fetchNextPage when in view", () => {
    const fetchNextPage = vi.fn();
    (useEventsHook.useEvents as any).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchNextPage,
      hasNextPage: true,
      isFetchingNextPage: false,
    });

    // Mock inView to true
    mockUseInView.mockReturnValue({ ref: vi.fn(), inView: true });

    renderComponent();
    expect(fetchNextPage).toHaveBeenCalled();
  });

  it("shows no results message when filters match nothing", async () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    });

    renderComponent();
    const searchInput = screen.getByPlaceholderText("Buscar por nome...");
    fireEvent.change(searchInput, { target: { value: "Inexistente" } });

    await waitFor(() => {
      expect(screen.getByText("Nenhum evento encontrado")).toBeInTheDocument();
    });
  });

  it("shows loading more spinner", () => {
    (useEventsHook.useEvents as any).mockReturnValue({
      events: mockEvents,
      loading: false,
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: true,
      isFetchingNextPage: true,
    });

    renderComponent();
    expect(screen.getByText("Carregando mais...")).toBeInTheDocument();
  });
});
