import { act, render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminPage from "./AdminPage";
import {
  adminRealtimeService,
  eventService,
  paymentService,
  ticketService,
} from "@/services/firestore";
import { useAuth } from "@/hooks/auth/useAuth";
import { toast } from "sonner";

vi.mock("sonner", () => ({
  toast: { success: vi.fn(), error: vi.fn() },
}));

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
  default: ({ totalTickets, totalRevenue }: any) => (
    <div data-testid="admin-dashboard">
      {totalTickets}|{totalRevenue}
    </div>
  ),
}));

// Mocked to isolate AdminPage tests from EventForm behavior (tested separately)
vi.mock("./EventForm", () => ({
  EventForm: ({ onCancel, onSave, initialData }: any) => (
    <div data-testid="event-form">
      <h2>{initialData ? "Edit Mode" : "Create Mode"}</h2>
      <button onClick={() => onSave({ title: "New Event" })}>Save Mock</button>
      {initialData && (
        <>
          <button
            onClick={() =>
              void onSave({
                ...initialData,
                title: "Updated title",
                location: "Updated location",
              }).catch(() => undefined)
            }
          >
            Save Editable Mock
          </button>
          <button
            onClick={() =>
              void onSave({
                ...initialData,
                price: initialData.price + 1,
              }).catch(() => undefined)
            }
          >
            Save Price Mock
          </button>
          <button
            onClick={() =>
              void onSave({
                ...initialData,
                inventory: { standard: 1 },
              }).catch(() => undefined)
            }
          >
            Save Inventory Mock
          </button>
          <button
            onClick={() =>
              void onSave({
                ...initialData,
                title: "Title without pricing",
                pricing: { standard: 0, vip: 0, premium: 0 },
              }).catch(() => undefined)
            }
          >
            Save Missing Pricing Mock
          </button>
          <button
            onClick={() =>
              void onSave({
                ...initialData,
                location: "Location without inventory",
                inventory: { standard: 0, vip: 0, premium: 0 },
              }).catch(() => undefined)
            }
          >
            Save Missing Inventory Mock
          </button>
          <button
            onClick={() =>
              void onSave({
                ...initialData,
                description: "Zero maps are canonical",
                pricing: { standard: 0, vip: 0, premium: 0 },
                inventory: { standard: 0, vip: 0, premium: 0 },
              }).catch(() => undefined)
            }
          >
            Save Zero Maps Mock
          </button>
          <button
            onClick={() =>
              void onSave({
                ...initialData,
                pricing: { standard: 10, vip: 0, premium: 0 },
              }).catch(() => undefined)
            }
          >
            Save Nonzero Pricing Mock
          </button>
        </>
      )}
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

  it("preserva erro especifico ao excluir evento", async () => {
    (eventService.deleteEvent as any).mockRejectedValueOnce(
      new Error("O evento pertence a outro organizador.")
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithEvents();
    await screen.findByText("Event 1");

    fireEvent.click(screen.getAllByText("Excluir")[0]);

    await waitFor(() => {
      expect(toast.error).toHaveBeenCalledTimes(1);
      expect(toast.error).toHaveBeenCalledWith(
        "O evento pertence a outro organizador."
      );
    });
  });

  it("edita titulo e local enviando somente campos editaveis alterados", async () => {
    renderWithEvents();
    await screen.findByText("Event 1");
    fireEvent.click(screen.getAllByText("Editar")[0]);
    fireEvent.click(screen.getByText("Save Editable Mock"));

    await waitFor(() => {
      expect(eventService.updateEvent).toHaveBeenCalledWith("1", {
        title: "Updated title",
        location: "Updated location",
      });
    });
    expect(toast.success).not.toHaveBeenCalled();
  });

  it("evento sem pricing edita somente o titulo", async () => {
    renderWithEvents();
    await screen.findByText("Event 1");
    fireEvent.click(screen.getAllByText("Editar")[0]);
    fireEvent.click(screen.getByText("Save Missing Pricing Mock"));

    await waitFor(() => {
      expect(eventService.updateEvent).toHaveBeenCalledWith("1", {
        title: "Title without pricing",
      });
    });
  });

  it("evento sem inventory edita somente o local", async () => {
    renderWithEvents();
    await screen.findByText("Event 1");
    fireEvent.click(screen.getAllByText("Editar")[0]);
    fireEvent.click(screen.getByText("Save Missing Inventory Mock"));

    await waitFor(() => {
      expect(eventService.updateEvent).toHaveBeenCalledWith("1", {
        location: "Location without inventory",
      });
    });
  });

  it("trata mapas ausentes e totalmente zerados como equivalentes", async () => {
    renderWithEvents();
    await screen.findByText("Event 1");
    fireEvent.click(screen.getAllByText("Editar")[0]);
    fireEvent.click(screen.getByText("Save Zero Maps Mock"));

    await waitFor(() => {
      expect(eventService.updateEvent).toHaveBeenCalledWith("1", {
        description: "Zero maps are canonical",
      });
    });
    expect(toast.error).not.toHaveBeenCalled();
  });

  it.each([
    "Save Price Mock",
    "Save Inventory Mock",
    "Save Nonzero Pricing Mock",
  ])(
    "recusa explicitamente alteracao protegida por %s sem mostrar sucesso",
    async (action) => {
      renderWithEvents();
      await screen.findByText("Event 1");
      fireEvent.click(screen.getAllByText("Editar")[0]);
      fireEvent.click(screen.getByText(action));

      await Promise.resolve();
      expect(eventService.updateEvent).not.toHaveBeenCalled();
      expect(toast.error).not.toHaveBeenCalled();
      expect(toast.success).not.toHaveBeenCalled();
    }
  );

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

  it("ignora uma carga antiga do painel do organizer", async () => {
    (useAuth as any).mockReturnValue({
      userProfile: { uid: "org-a", role: "organizer" },
    });
    let emitEvents: ((events: any[]) => void) | undefined;
    (adminRealtimeService.subscribeToOrganizerEvents as any).mockImplementation(
      (_uid: string, onUpdate: (events: any[]) => void) => {
        emitEvents = onUpdate;
        return vi.fn();
      }
    );

    let resolveOldTickets!: (tickets: any[]) => void;
    let resolveNewTickets!: (tickets: any[]) => void;
    let resolveOldPayments!: (payments: any[]) => void;
    let resolveNewPayments!: (payments: any[]) => void;
    const oldTickets = new Promise<any[]>((resolve) => {
      resolveOldTickets = resolve;
    });
    const newTickets = new Promise<any[]>((resolve) => {
      resolveNewTickets = resolve;
    });
    const oldPayments = new Promise<any[]>((resolve) => {
      resolveOldPayments = resolve;
    });
    const newPayments = new Promise<any[]>((resolve) => {
      resolveNewPayments = resolve;
    });
    (ticketService.getTicketsByEvent as any).mockImplementation(
      (eventId: string) => (eventId === "old" ? oldTickets : newTickets)
    );
    (paymentService.getPaymentsByEvent as any).mockImplementation(
      (eventId: string) => (eventId === "old" ? oldPayments : newPayments)
    );

    render(<AdminPage />);
    act(() => emitEvents?.([{ ...mockEvents[0], id: "old" }]));
    act(() => emitEvents?.([{ ...mockEvents[1], id: "new" }]));

    await act(async () => {
      resolveNewTickets([{ id: "new-ticket", eventId: "new" }]);
      resolveNewPayments([
        { id: "new-payment", eventId: "new", totalAmount: 20 },
      ]);
      await Promise.all([newTickets, newPayments]);
    });
    expect(screen.getByTestId("admin-dashboard")).toHaveTextContent("1|20");

    await act(async () => {
      resolveOldTickets([
        { id: "old-ticket-1", eventId: "old" },
        { id: "old-ticket-2", eventId: "old" },
      ]);
      resolveOldPayments([
        { id: "old-payment", eventId: "old", totalAmount: 99 },
      ]);
      await Promise.all([oldTickets, oldPayments]);
    });
    expect(screen.getByTestId("admin-dashboard")).toHaveTextContent("1|20");
  });
});
