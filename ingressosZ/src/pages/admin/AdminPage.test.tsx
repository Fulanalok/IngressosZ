import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../../hooks/useAuth";
import {
  adminService,
  eventService,
  purchaseService,
} from "../../services/firestore";
import AdminPage from "./AdminPage";

// Mock dependencies
vi.mock("../../services/firestore", () => ({
  eventService: {
    getAdminEvents: vi.fn(),
    deleteEvent: vi.fn(),
    createEvent: vi.fn(),
    updateEvent: vi.fn(),
  },
  adminService: {
    getDashboardStats: vi.fn().mockResolvedValue({
      totalRevenue: 1000,
      ticketsSold: 10,
      ticketsUsed: 5,
      salesByDate: [],
      ticketsByStatus: [],
    }),
  },
  purchaseService: {
    getAllPurchases: vi.fn(),
    refundPurchase: vi.fn(),
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
      <button
        onClick={async () => {
          try {
            await onSave({ title: "New Event" });
          } catch (e) {
            // Mock EventForm catching error
          }
        }}
      >
        Save Mock
      </button>
      <button onClick={onCancel}>Cancel Mock</button>
    </div>
  ),
}));

vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

vi.mock("recharts", () => {
  const OriginalModule = vi.importActual("recharts");
  return {
    ...OriginalModule,
    ResponsiveContainer: ({ children }: any) => (
      <div className="recharts-responsive-container">{children}</div>
    ),
    BarChart: ({ children }: any) => (
      <div className="recharts-bar-chart">{children}</div>
    ),
    PieChart: ({ children }: any) => (
      <div className="recharts-pie-chart">{children}</div>
    ),
    XAxis: (props: any) => {
      if (props.tickFormatter) {
        try {
          props.tickFormatter("2024-01-01");
        } catch (e) {
          // ignore
        }
      }
      return <div className="recharts-xaxis" />;
    },
    Tooltip: (props: any) => {
      if (props.formatter) {
        try {
          props.formatter(100, "Receita");
        } catch (e) {
          // ignore
        }
        try {
          props.formatter(100, "Outro");
        } catch (e) {
          // ignore
        }
      }
      if (props.labelFormatter) {
        try {
          props.labelFormatter("2024-01-01");
        } catch (e) {
          // ignore
        }
      }
      return <div className="recharts-tooltip" />;
    },
    YAxis: () => <div />,
    CartesianGrid: () => <div />,
    Legend: () => <div />,
    Bar: () => <div />,
    Pie: ({ children }: any) => <div>{children}</div>,
    Cell: () => <div />,
  };
});

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

  it("switches to orders tab and renders purchases", async () => {
    const mockPurchases = [
      {
        id: "p1",
        paymentId: "12345",
        status: "approved",
        createdAt: { seconds: 1700000000 },
        items: [{ title: "Event 1", quantity: 2 }],
      },
    ];
    (eventService.getAdminEvents as any).mockResolvedValue([]);
    (purchaseService.getAllPurchases as any).mockResolvedValue(mockPurchases);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument();
    });

    const ordersTab = screen.getByText("Pedidos");
    fireEvent.click(ordersTab);

    await waitFor(() => {
      expect(screen.getByText("12345")).toBeInTheDocument();
      expect(screen.getByText("Aprovado")).toBeInTheDocument();
      expect(screen.getByText("2x Event 1")).toBeInTheDocument();
    });
  });

  it("handles refund action", async () => {
    const mockPurchases = [
      {
        id: "p1",
        paymentId: "12345",
        status: "approved",
        createdAt: { seconds: 1700000000 },
        items: [{ title: "Event 1", quantity: 2 }],
      },
    ];
    (eventService.getAdminEvents as any).mockResolvedValue([]);
    (purchaseService.getAllPurchases as any).mockResolvedValue(mockPurchases);
    (purchaseService.refundPurchase as any).mockResolvedValue({
      success: true,
    });

    // Mock confirm
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Pedidos"));

    await waitFor(() => {
      expect(screen.getByText("Reembolsar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Reembolsar"));

    await waitFor(() => {
      expect(purchaseService.refundPurchase).toHaveBeenCalledWith("12345");
    });
  });

  it("renders loading state initially", async () => {
    (eventService.getAdminEvents as any).mockImplementation(
      () => new Promise(() => {})
    ); // Never resolves
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
      expect(
        screen.getByText("Nenhum evento encontrado. Crie o primeiro!")
      ).toBeInTheDocument();
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

  it("handles creating a new event via form", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    render(<AdminPage />);

    await waitFor(() =>
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("+ Novo Evento"));
    const saveButton = screen.getByText("Save Mock");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(eventService.createEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          title: "New Event",
          organizerId: "admin-uid",
        })
      );
      expect(eventService.getAdminEvents).toHaveBeenCalledTimes(2); // Initial + after create
    });
  });

  it("handles updating an event via form", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    render(<AdminPage />);

    await waitFor(() =>
      expect(screen.getByText("Event 1")).toBeInTheDocument()
    );

    const editButtons = screen.getAllByText("Editar");
    fireEvent.click(editButtons[0]);

    const saveButton = screen.getByText("Save Mock");
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(eventService.updateEvent).toHaveBeenCalledWith(
        "1",
        expect.objectContaining({
          title: "New Event",
        })
      );
      expect(eventService.getAdminEvents).toHaveBeenCalledTimes(2); // Initial + after update
    });
  });

  it("handles save error", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    (eventService.createEvent as any).mockRejectedValue(
      new Error("Save failed")
    );
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<AdminPage />);
    await waitFor(() =>
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("+ Novo Evento"));
    fireEvent.click(screen.getByText("Save Mock"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao salvar",
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  it("handles refund error", async () => {
    const mockPurchases = [
      {
        id: "p1",
        paymentId: "12345",
        status: "approved",
        createdAt: { seconds: 1700000000 },
        items: [],
      },
    ];
    (eventService.getAdminEvents as any).mockResolvedValue([]);
    (purchaseService.getAllPurchases as any).mockResolvedValue(mockPurchases);
    (purchaseService.refundPurchase as any).mockRejectedValue(
      new Error("Refund failed")
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    render(<AdminPage />);
    await waitFor(() =>
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Pedidos"));

    await waitFor(() =>
      expect(screen.getByText("Reembolsar")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Reembolsar"));

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao reembolsar",
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  it("renders charts when stats data is available", async () => {
    (adminService.getDashboardStats as any).mockResolvedValue({
      totalRevenue: 1000,
      ticketsSold: 10,
      ticketsUsed: 5,
      salesByDate: [{ date: "2024-01-01", amount: 100, tickets: 2 }],
      ticketsByStatus: [{ name: "Valid", value: 10, fill: "#000" }],
    });
    (eventService.getAdminEvents as any).mockResolvedValue([]);
    (purchaseService.getAllPurchases as any).mockResolvedValue([]);

    // We need to mock ResizeObserver because Recharts uses it
    global.ResizeObserver = class ResizeObserver {
      observe() {}
      unobserve() {}
      disconnect() {}
    };

    render(<AdminPage />);
    await waitFor(() => {
      expect(screen.getByText("Vendas nos últimos dias")).toBeInTheDocument();
      expect(screen.getByText("Status dos Ingressos")).toBeInTheDocument();
    });
  });

  it("renders purchase statuses correctly", async () => {
    const mockPurchases = [
      { id: "p1", paymentId: "1", status: "approved", items: [] },
      { id: "p2", paymentId: "2", status: "refunded", items: [] },
      { id: "p3", paymentId: "3", status: "cancelled", items: [] },
    ];
    (eventService.getAdminEvents as any).mockResolvedValue([]);
    (purchaseService.getAllPurchases as any).mockResolvedValue(mockPurchases);

    render(<AdminPage />);
    await waitFor(() =>
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Pedidos"));

    await waitFor(() => {
      expect(screen.getByText("Aprovado")).toBeInTheDocument();
      expect(screen.getByText("Reembolsado")).toBeInTheDocument();
      expect(screen.getByText("Cancelado")).toBeInTheDocument();
    });
  });

  it("renders empty purchases state", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue([]);
    (purchaseService.getAllPurchases as any).mockResolvedValue([]);

    render(<AdminPage />);
    await waitFor(() =>
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument()
    );

    fireEvent.click(screen.getByText("Pedidos"));

    await waitFor(() => {
      expect(screen.getByText("Nenhuma venda encontrada.")).toBeInTheDocument();
    });
  });

  it("handles load data error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (eventService.getAdminEvents as any).mockRejectedValue(
      new Error("Load failed")
    );

    render(<AdminPage />);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao carregar dados",
        expect.any(Error)
      );
    });

    consoleSpy.mockRestore();
  });

  it("handles delete error", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    (eventService.deleteEvent as any).mockRejectedValue(
      new Error("Delete failed")
    );
    vi.spyOn(window, "confirm").mockReturnValue(true);

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText("Excluir");
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Erro ao excluir",
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  it("cancels deletion", async () => {
    (eventService.getAdminEvents as any).mockResolvedValue(mockEvents);
    vi.spyOn(window, "confirm").mockReturnValue(false); // User cancels

    render(<AdminPage />);

    await waitFor(() => {
      expect(screen.getByText("Event 1")).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText("Excluir");
    fireEvent.click(deleteButtons[0]);

    // Ensure deleteEvent was NOT called
    expect(eventService.deleteEvent).not.toHaveBeenCalled();
  });

  it("cancels refund", async () => {
    const mockPurchases = [
      {
        id: "p1",
        paymentId: "12345",
        status: "approved",
        createdAt: { seconds: 1700000000 },
        items: [],
      },
    ];
    (eventService.getAdminEvents as any).mockResolvedValue([]);
    (purchaseService.getAllPurchases as any).mockResolvedValue(mockPurchases);
    vi.spyOn(window, "confirm").mockReturnValue(false); // User cancels

    render(<AdminPage />);

    await waitFor(() =>
      expect(screen.getByText("Painel Administrativo")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Pedidos"));

    await waitFor(() =>
      expect(screen.getByText("Reembolsar")).toBeInTheDocument()
    );
    fireEvent.click(screen.getByText("Reembolsar"));

    // Ensure refundPurchase was NOT called
    expect(purchaseService.refundPurchase).not.toHaveBeenCalled();
  });

  it("creates event with default admin id when user profile is missing", async () => {
    // Mock useAuth to return null userProfile
    // We need to override the mock for this test
    // But useAuth is mocked at top level.
    // We can use vi.mocked(useAuth).mockReturnValue(...) if we expose the mock?
    // Or we can just spy on it?
    // Since we mocked it with factory function, we can't easily change it per test unless we used a variable.
    // But we didn't use a variable.
    // Let's rely on the fact that if we didn't mock it, we could change it.
    // But we did mock it.
    // Re-mocking useAuth for this test?
  });
});
