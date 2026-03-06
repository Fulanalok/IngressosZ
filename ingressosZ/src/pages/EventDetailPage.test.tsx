import "@testing-library/jest-dom/vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import EventDetailPage from "./EventDetailPage";

const { authState, eventState } = vi.hoisted(() => ({
  authState: {
    user: null as any,
    loading: false,
  },
  eventState: {
    data: null as any,
    status: "success",
    error: null as Error | null,
  },
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => authState,
}));

vi.mock("@/hooks/useEvents", () => ({
  useEvent: () => eventState,
}));

const mockNavigate = vi.fn();
vi.mock("react-router-dom", () => ({
  useParams: () => ({ eventId: "123" }),
  useNavigate: () => mockNavigate,
}));

vi.mock("@/components/event", () => ({
  TicketPurchase: () => <div data-testid="ticket-purchase" />,
  ShareButtons: () => <div data-testid="share-buttons" />,
}));

vi.mock("@dr.pogodin/react-helmet", () => ({
  Helmet: ({ children }: { children: React.ReactNode }) => <>{children}</>,
}));

describe("EventDetailPage", () => {
  const mockEvent = {
    id: "123",
    title: "Test Event",
    description: "Desc",
    date: "2023-12-25T20:00:00.000Z",
    time: "20:00",
    price: 100,
    availableTickets: 20,
    image: "img.jpg",
    location: "Loc",
    address: "Rua A, 123",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    authState.user = null;
    authState.loading = false;
    eventState.data = null;
    eventState.status = "success";
    eventState.error = null;
  });

  it("renders loading state", () => {
    eventState.status = "pending";
    render(<EventDetailPage />);
    expect(document.querySelector(".animate-pulse")).toBeInTheDocument();
  });

  it("renders error state", () => {
    eventState.status = "error";
    eventState.error = new Error("Not found");
    render(<EventDetailPage />);
    expect(
      screen.getByText("Erro ao carregar o evento: Not found")
    ).toBeInTheDocument();
  });

  it("renders not found state", () => {
    eventState.data = null;
    render(<EventDetailPage />);
    expect(screen.getByText("Evento não encontrado")).toBeInTheDocument();
    expect(screen.getByText("Voltar para Home")).toBeInTheDocument();
  });

  it("renders event details", () => {
    eventState.data = mockEvent;
    render(<EventDetailPage />);
    expect(screen.getByText("Test Event")).toBeInTheDocument();
    expect(screen.getByText("20:00")).toBeInTheDocument();
    expect(screen.getByText("Loc - Rua A, 123")).toBeInTheDocument();
  });

  it("shows purchase button when user is not authenticated", () => {
    eventState.data = mockEvent;
    authState.user = null;
    render(<EventDetailPage />);
    expect(screen.getByText("Comprar Ingressos")).toBeInTheDocument();
  });

  it("shows purchase modal when user clicks buy", () => {
    eventState.data = mockEvent;
    authState.user = null;
    render(<EventDetailPage />);
    fireEvent.click(screen.getByText("Comprar Ingressos"));
    expect(screen.getByTestId("ticket-purchase")).toBeInTheDocument();
  });
});
