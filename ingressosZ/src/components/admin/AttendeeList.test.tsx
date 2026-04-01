import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { getDoc } from "firebase/firestore";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ticketService } from "../../services/firestore";
import AttendeeList from "./AttendeeList";

vi.mock("../../services/firestore", () => ({
  ticketService: { getTicketsByEvent: vi.fn() },
}));

vi.mock("../../firebaseConfig", () => ({ db: {}, functions: {} }));

vi.mock("firebase/firestore", async () => {
  const actual = await vi.importActual<typeof import("firebase/firestore")>("firebase/firestore");
  return {
    ...actual,
    getFirestore: vi.fn(() => ({})),
    connectFirestoreEmulator: vi.fn(),
    doc: vi.fn().mockReturnValue({}),
    getDoc: vi.fn().mockResolvedValue({
      exists: () => true,
      data: () => ({ paymentId: "pay-1" }),
    }),
  };
});

vi.mock("sonner", () => ({
  toast: { error: vi.fn(), success: vi.fn() },
}));

const fakeTimestamp = (dateStr: string) => ({ toDate: () => new Date(dateStr) });

const mockTickets = [
  {
    id: "t1",
    eventId: "e1",
    userId: "u1",
    purchaseId: "p1",
    userEmail: "alice@example.com",
    purchaseDate: fakeTimestamp("2024-06-01"),
    qrCode: "QR-1",
    status: "valid",
    price: 100,
    ticketType: "standard",
  },
  {
    id: "t2",
    eventId: "e1",
    userId: "u2",
    purchaseId: "p2",
    userEmail: "bob@example.com",
    purchaseDate: fakeTimestamp("2024-06-02"),
    qrCode: "QR-2",
    status: "used",
    price: 200,
    ticketType: "vip",
  },
  {
    id: "t3",
    eventId: "e1",
    userId: "u3",
    purchaseId: "p3",
    userEmail: "carol@example.com",
    purchaseDate: fakeTimestamp("2024-06-03"),
    qrCode: "QR-3",
    status: "cancelled",
    price: 300,
    ticketType: "premium",
  },
];

const defaultProps = {
  eventId: "e1",
  eventName: "Evento Teste",
  onClose: vi.fn(),
};

describe("AttendeeList Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (ticketService.getTicketsByEvent as any).mockResolvedValue(mockTickets);
  });

  it("exibe loading enquanto busca participantes", () => {
    (ticketService.getTicketsByEvent as any).mockReturnValue(new Promise(() => {}));
    render(<AttendeeList {...defaultProps} />);
    expect(screen.getByText("Carregando participantes...")).toBeInTheDocument();
  });

  it("exibe lista de participantes após carregar", async () => {
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
      expect(screen.getByText("bob@example.com")).toBeInTheDocument();
      expect(screen.getByText("carol@example.com")).toBeInTheDocument();
    });
  });

  it("exibe contagem de ingressos no header", async () => {
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("3 ingressos vendidos")).toBeInTheDocument();
    });
  });

  it("exibe status correto para cada ticket", async () => {
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Válido")).toBeInTheDocument();
      expect(screen.getByText("Usado")).toBeInTheDocument();
      expect(screen.getByText("Reembolsado")).toBeInTheDocument();
    });
  });

  it("exibe estado vazio quando não há participantes", async () => {
    (ticketService.getTicketsByEvent as any).mockResolvedValue([]);
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Nenhum participante encontrado.")).toBeInTheDocument();
    });
  });

  it("filtra participantes por e-mail", async () => {
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Buscar por e-mail..."), {
      target: { value: "alice" },
    });

    expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    expect(screen.queryByText("bob@example.com")).not.toBeInTheDocument();
    expect(screen.queryByText("carol@example.com")).not.toBeInTheDocument();
  });

  it("exibe 'Nenhum participante encontrado.' quando filtro não retorna resultados", async () => {
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });

    fireEvent.change(screen.getByPlaceholderText("Buscar por e-mail..."), {
      target: { value: "naoexiste@teste.com" },
    });

    expect(screen.getByText("Nenhum participante encontrado.")).toBeInTheDocument();
  });

  it("botão Exportar CSV fica desabilitado quando não há participantes", async () => {
    (ticketService.getTicketsByEvent as any).mockResolvedValue([]);
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Exportar CSV").closest("button")).toBeDisabled();
    });
  });

  it("chama onClose ao clicar no botão de fechar", async () => {
    const onClose = vi.fn();
    render(<AttendeeList {...defaultProps} onClose={onClose} />);
    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });
    // X button is the first button in DOM (icon-only, in the header)
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onClose).toHaveBeenCalled();
  });

  it("exibe botão Reembolsar apenas para ingressos com status valid", async () => {
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("alice@example.com")).toBeInTheDocument();
    });
    // Only alice (valid) has the refund button; bob (used) and carol (cancelled) don't
    expect(screen.getAllByText("Reembolsar")).toHaveLength(1);
  });

  it("processa reembolso com sucesso ao confirmar", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(true);
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Reembolsar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Reembolsar"));

    await waitFor(() => {
      expect(toast.success).toHaveBeenCalledWith(
        "Reembolso processado para alice@example.com"
      );
    });
    confirmSpy.mockRestore();
  });

  it("não processa reembolso quando usuário cancela confirmação", async () => {
    const confirmSpy = vi.spyOn(window, "confirm").mockReturnValue(false);
    render(<AttendeeList {...defaultProps} />);
    await waitFor(() => {
      expect(screen.getByText("Reembolsar")).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText("Reembolsar"));

    expect(getDoc).not.toHaveBeenCalled();
    expect(toast.success).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
