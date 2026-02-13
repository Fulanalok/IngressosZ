import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, expect, it, vi, beforeEach } from "vitest";
import AdminPage from "./AdminPage";
import { eventService } from "../../services/firestore";
import { useAuth } from "../../hooks/useAuth";

// Mock dependencies
vi.mock("../../services/firestore", () => ({
  eventService: {
    getAdminEvents: vi.fn(),
    deleteEvent: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
  },
}));

vi.mock("../../hooks/useAuth", () => ({
  useAuth: vi.fn(),
}));

// Mock EventForm to simplify AdminPage tests (we already tested EventForm separately)
vi.mock("./EventForm", () => ({
  EventForm: ({ onCancel, onSave, initialData }: any) => (
    <div data-testid="event-form">
      <h2>{initialData ? "Edit Mode" : "Create Mode"}</h2>
      <button onClick={() => onSave({ title: "New Event" })}>Save Mock</button>
      <button onClick={onCancel}>Cancel Mock</button>
    </div>
  ),
}));

describe("AdminPage Component", () => {
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

  beforeEach(() => {
    vi.clearAllMocks();
    (useAuth as any).mockReturnValue({
      userProfile: { uid: "admin-uid", role: "admin" },
    });
  });

  it("renders loading state initially", async () => {
    (eventService.getAdminEvents as any).mockImplementation(() => new Promise(() => {})); // Never resolves
    render(<AdminPage />);
    expect(screen.getByText("Carregando painel...")).toBeInTheDocument();
  });

  it("renders list of events after loading", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument();
    });

    expect(screen.getByText("Event 1")).toBeInTheDocument();
    expect(screen.getByText("Event 2 (Sold Out)")).toBeInTheDocument();
    
    // Check inventory display
    expect(screen.getByText("50 / 100")).toBeInTheDocument();
    expect(screen.getByText("0 / 100")).toBeInTheDocument();
  });

  it("renders empty state when no events found", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue([]);
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Nenhum evento encontrado. Crie o primeiro!")).toBeInTheDocument();
    });
  });

  it("opens create form when clicking 'Novo Evento'", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("+ Novo Evento"));

    expect(screen.getByTestId("event-form")).toBeInTheDocument();
    expect(screen.getByText("Create Mode")).toBeInTheDocument();
  });

  it("opens edit form when clicking 'Editar'", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });

    // Click edit on the first event
    const editButtons = screen.getAllByText("Editar");
    fireEvent.click(editButtons[0]);

    expect(screen.getByTestId("event-form")).toBeInTheDocument();
    expect(screen.getByText("Edit Mode")).toBeInTheDocument();
  });

  it("handles event deletion", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    // Mock window.confirm
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    
    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText("Excluir");
    fireEvent.click(deleteButtons[0]);

    expect(confirmSpy).toHaveBeenCalled();
    expect(eventService.deleteEvent).toHaveBeenCalledWith("1");
    
    // Should reload events
    await waitFor(() => {
      expect(eventService.getAdminEvents).toHaveBeenCalledTimes(2); // Initial + after delete
    });
  });
});
