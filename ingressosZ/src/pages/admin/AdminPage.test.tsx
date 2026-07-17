import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminPage from "./AdminPage";
import {
  adminRealtimeService,
  eventService,
  paymentService,
  ticketService,
} from "@/services/firestore";
import { useAuth } from "@/hooks/auth/useAuth";

vi.mock("../../services/firestore", () => ({
  eventService: {
    getAdminEvents: vi.fn(),
    deleteEvent: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
  },
  ticketService: {
    getUserTickets: vi.fn(),
    subscribeToUserTickets: vi.fn(() => vi.fn()),
    getTicketById: vi.fn(),
    getTicketsByEvent: vi.fn().mockResolvedValue([]),
  },
  userService: {
    getUserProfile: vi.fn(),
  },
  paymentService: {
    getPaymentsByEvent: vi.fn().mockResolvedValue([]),
    subscribeToAllPayments: vi.fn().mockImplementation((onUpdate) => {
      onUpdate([]);
      return vi.fn();
    }),
  },
  adminRealtimeService: {
    subscribeToAdminEvents: vi.fn().mockImplementation(() => vi.fn()),
    subscribeToOrganizerEvents: vi.fn().mockImplementation((_uid, onUpdate) => {
      onUpdate([]);
      return vi.fn();
    }),
    subscribeToAllTickets: vi.fn().mockImplementation((onUpdate) => {
      onUpdate([]);
      return vi.fn();
    }),
  },
}));

vi.mock("@/hooks/auth/useAuth", () => ({
  useAuth: vi.fn().mockReturnValue({
    userProfile: { uid: "admin-uid", role: "admin" },
  }),
}));

// Mocked to avoid rendering event titles in the dashboard (which would cause duplicate text matches)
vi.mock("../../components/admin/AdminDashboard", () => ({
  default: () => <div data-testid="admin-dashboard" />,
}));

// Mocked to isolate AdminPage tests from EventForm behavior (tested separately)
vi.mock("./EventForm", () => ({
  EventForm: ({ onCancel, onSave, initialData }: any) => (
    <div data-testid="event-form">
      <h2>{initialData ? "Edit Mode" : "Create Mode"}</h2>
      <button onClick={() => onSave({ title: "New Event" })}>Save Mock</button>
      <button onClick={onCancel}>Cancel Mock</button>
    </div>
  ),
}));

const mockEvents = [
  {
    id: "1",
    title: "Event 1",
    date: "2023-12-31",
    location: "Loc 1",
    price: 100,
    availableTickets: 50,
    maxTickets: 100,
  },
  {
    id: "2",
    title: "Event 2 (Sold Out)",
    date: "2024-01-01",
    location: "Loc 2",
    price: 200,
    availableTickets: 0,
    maxTickets: 100,
  },
];

function renderWithEvents(events = mockEvents) {
  (adminRealtimeService.subscribeToAdminEvents as any).mockImplementation((onUpdate: any) => {
    onUpdate(events);
    return vi.fn();
  });
  return render(<AdminPage />);
}

describe("AdminPage Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      userProfile: { uid: "admin-uid", role: "admin" },
    });
  });

  it("renders loading state initially", () => {
    // subscribeToAdminEvents never calls onUpdate, so loading persists
    render(<AdminPage />);
    expect(screen.getByText("Carregando painel...")).toBeInTheDocument();
  });

  it("renders list of events after loading", async () => {
    renderWithEvents();

    await waitFor(() => {
      expect(screen.getByText("Painel do Organizador")).toBeInTheDocument();
    });

    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2 (Sold Out)")).toBeInTheDocument();

    // Sales display: sold / total (maxTickets - availableTickets / maxTickets)
    expect(screen.getByText("50 / 100")).toBeInTheDocument();
    expect(screen.getByText("100 / 100")).toBeInTheDocument();
  });

  it("renders empty state when no events found", async () => {
    renderWithEvents([]);

    await waitFor(() => {
      expect(screen.getByText("Nenhum evento encontrado.")).toBeInTheDocument();
    });
  });

  it("opens create form when clicking 'Novo Evento'", async () => {
    renderWithEvents();

    await waitFor(() => {
      expect(screen.getByText("Painel do Organizador")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Novo Evento"));

    expect(screen.getByTestId("event-form")).toBeInTheDocument();
    expect(screen.getByText("Create Mode")).toBeInTheDocument();
  });

  it("opens edit form when clicking 'Editar'", async () => {
    renderWithEvents();

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Editar")[0]);

    expect(screen.getByTestId("event-form")).toBeInTheDocument();
    expect(screen.getByText("Edit Mode")).toBeInTheDocument();
  });

  it("handles event deletion", async () => {
    renderWithEvents();
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });

    fireEvent.click(screen.getAllByText("Excluir")[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(eventService.deleteEvent).toHaveBeenCalledWith("1");
  });

  it("organizer consulta somente dados dos proprios eventos", async () => {
    (useAuth as any).mockReturnValue({
      userProfile: { uid: "org-a", role: "organizer" },
    });
    (
      adminRealtimeService.subscribeToOrganizerEvents as any
    ).mockImplementation((_uid: string, onUpdate: any) => {
      onUpdate([mockEvents[0]]);
      return vi.fn();
    });

    render(<AdminPage />);

    await waitFor(() => {
      expect(ticketService.getTicketsByEvent).toHaveBeenCalledWith("1");
      expect(paymentService.getPaymentsByEvent).toHaveBeenCalledWith("1");
    });
    expect(
      adminRealtimeService.subscribeToOrganizerEvents
    ).toHaveBeenCalledWith("org-a", expect.any(Function), expect.any(Function));
    expect(adminRealtimeService.subscribeToAllTickets).not.toHaveBeenCalled();
    expect(screen.queryByText("Configurações")).not.toBeInTheDocument();
  });
});
