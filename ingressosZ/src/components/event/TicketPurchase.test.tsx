import { fireEvent, render, screen, within } from "@testing-library/react";
import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { Event } from "../../types";
import { TicketPurchase } from "./TicketPurchase";

// Mutable object so individual tests can override hook return values
const mockCheckout = {
  createPreference: vi.fn(),
  createPixPayment: vi.fn(),
  preferenceId: null as string | null,
  pixData: null as { qrCode: string; qrCodeBase64: string | null; ticketUrl?: string } | null,
  isLoading: false,
  error: null as string | null,
};

vi.mock("@/hooks/payment/useMercadoPagoCheckout", () => ({
  useMercadoPagoCheckout: () => mockCheckout,
}));

vi.mock("@mercadopago/sdk-react", () => ({
  Wallet: () => <div data-testid="wallet" />,
  StatusScreen: () => <div data-testid="status-screen" />,
  initMercadoPago: vi.fn(),
}));

vi.mock("@/components/qr/QRCodeDisplay", () => ({
  default: ({ qrCode }: { qrCode: string }) => (
    <div data-testid="qr-display">{qrCode}</div>
  ),
}));

const mockEvent: Event = {
  id: "1",
  title: "Test Event",
  description: "Description",
  date: "2023-12-31",
  time: "20:00",
  location: "Test Location",
  address: "Test Address",
  price: 100,
  maxTickets: 100,
  availableTickets: 50,
  category: "Music",
  organizerId: "org1",
  createdAt: Timestamp.fromDate(new Date("2023-01-01")),
  updatedAt: Timestamp.fromDate(new Date("2023-01-01")),
  inventory: { standard: 10, vip: 5, premium: 0 },
  pricing: { standard: 100, vip: 200, premium: 300 },
};

const mockUser = { uid: "u1", email: "u1@example.com" } as User;

describe("TicketPurchase Component", () => {
  const originalPublicKey = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env?.VITE_MERCADOPAGO_PUBLIC_KEY;

  beforeEach(() => {
    vi.clearAllMocks();
    mockCheckout.preferenceId = null;
    mockCheckout.pixData = null;
    mockCheckout.isLoading = false;
    mockCheckout.error = null;
  });

  afterEach(() => {
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env = {
      ...(import.meta as unknown as { env?: Record<string, string | undefined> }).env,
      VITE_MERCADOPAGO_PUBLIC_KEY: originalPublicKey,
    };
  });

  it("renders correctly", () => {
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    expect(screen.getByText("Comprar Ingressos")).toBeTruthy();
  });

  it("displays correct pricing", () => {
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    expect(screen.getAllByText(/R\$\s*100\.00/)[0]).toBeTruthy();
    expect(screen.getByText(/R\$\s*200\.00/)).toBeTruthy();
    expect(screen.getByText(/R\$\s*300\.00/)).toBeTruthy();
  });

  it("handles sold out ticket types", () => {
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    expect(screen.getAllByText("(Esgotado)")).toHaveLength(1);
  });

  it("disables purchase when inventory is insufficient", () => {
    const lowStockEvent = {
      ...mockEvent,
      inventory: { ...mockEvent.inventory, standard: 0 },
    };
    render(<TicketPurchase event={lowStockEvent} user={mockUser} onClose={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Ir para Pagamento" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls createPreference when buy button is clicked", () => {
    (import.meta as unknown as { env?: Record<string, string | undefined> }).env = {
      ...(import.meta as unknown as { env?: Record<string, string | undefined> }).env,
      VITE_MERCADOPAGO_PUBLIC_KEY: "test-public-key",
    };
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    fireEvent.click(screen.getByRole("button", { name: "Ir para Pagamento" }));
    expect(mockCheckout.createPreference).toHaveBeenCalled();
  });

  it("exibe mensagem de login quando usuário não está autenticado", () => {
    render(<TicketPurchase event={mockEvent} user={null} onClose={vi.fn()} />);
    expect(screen.getByText("Faça login para continuar com a compra.")).toBeInTheDocument();
  });

  it("desabilita botão de pagamento quando usuário não está logado", () => {
    render(<TicketPurchase event={mockEvent} user={null} onClose={vi.fn()} />);
    const button = screen.getByRole("button", { name: "Ir para Pagamento" });
    expect(button).toBeDisabled();
  });

  it("exibe 'Processando...' no botão durante checkout", () => {
    mockCheckout.isLoading = true;
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    expect(screen.getByText("Processando...")).toBeInTheDocument();
  });

  it("exibe 'Gerar Pix' ao selecionar método Pix", () => {
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Pix"));
    expect(screen.getByText("Gerar Pix")).toBeInTheDocument();
  });

  it("chama createPixPayment ao clicar em 'Gerar Pix'", () => {
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Pix"));
    fireEvent.click(screen.getByText("Gerar Pix"));
    expect(mockCheckout.createPixPayment).toHaveBeenCalled();
  });

  it("exibe QR Code Pix quando pixData está disponível", () => {
    mockCheckout.pixData = { qrCode: "pix-code-123", qrCodeBase64: null };
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Pix"));
    // QR code text appears in both the QRCodeDisplay mock and the copy area
    expect(screen.getByTestId("qr-display")).toBeInTheDocument();
    expect(screen.getAllByText("pix-code-123").length).toBeGreaterThan(0);
  });

  it("exibe imagem base64 quando pixData.qrCodeBase64 está disponível", () => {
    mockCheckout.pixData = { qrCode: "pix-code", qrCodeBase64: "base64data" };
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Pix"));
    const img = screen.getByAltText("QR Code Pix");
    expect(img).toBeInTheDocument();
    expect(img).toHaveAttribute("src", "data:image/png;base64,base64data");
  });

  it("botão Copiar Pix copia o código para a área de transferência", () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.defineProperty(navigator, "clipboard", {
      value: { writeText },
      writable: true,
      configurable: true,
    });
    mockCheckout.pixData = { qrCode: "pix-code-xyz", qrCodeBase64: null };
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    fireEvent.click(screen.getByText("Pix"));
    fireEvent.click(screen.getByText("Copiar Pix"));
    expect(writeText).toHaveBeenCalledWith("pix-code-xyz");
  });

  it("atualiza total ao mudar tipo de ingresso para VIP", () => {
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />);
    // The Total section is the div containing "Total:" label
    const totalSection = screen.getByText("Total:").closest("div")!;
    expect(within(totalSection).getByText(/100\.00/)).toBeInTheDocument();
    // Switch to VIP (radios: standard[0], vip[1], premium[2])
    fireEvent.click(screen.getAllByRole("radio")[1]);
    expect(within(totalSection).getByText(/200\.00/)).toBeInTheDocument();
  });

  it("chama onClose ao clicar no botão X", () => {
    const onClose = vi.fn();
    render(<TicketPurchase event={mockEvent} user={mockUser} onClose={onClose} />);
    // X is the first button in DOM (header ghost icon button)
    fireEvent.click(screen.getAllByRole("button")[0]);
    expect(onClose).toHaveBeenCalled();
  });
});
