import { fireEvent, render, screen } from "@testing-library/react";
import type { User } from "firebase/auth";
import { Timestamp } from "firebase/firestore";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { Event } from "../../types";
import { TicketPurchase } from "./TicketPurchase";

const mockCreatePreference = vi.fn();

vi.mock("@/hooks/useMercadoPagoCheckout", () => ({
  useMercadoPagoCheckout: () => ({
    createPreference: mockCreatePreference,
    preferenceId: null,
    isLoading: false,
    error: null,
  }),
}));

vi.mock("@mercadopago/sdk-react", () => ({
  Wallet: () => <div data-testid="wallet" />,
  StatusScreen: () => <div data-testid="status-screen" />,
  initMercadoPago: vi.fn(),
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
  inventory: {
    standard: 10,
    vip: 5,
    premium: 0,
  },
  pricing: {
    standard: 100,
    vip: 200,
    premium: 300,
  },
};

const mockUser = {
  uid: "u1",
  email: "u1@example.com",
} as User;

describe("TicketPurchase Component", () => {
  const originalPublicKey = (
    import.meta as unknown as { env?: Record<string, string | undefined> }
  ).env?.VITE_MERCADOPAGO_PUBLIC_KEY;
  afterEach(() => {
    (
      import.meta as unknown as { env?: Record<string, string | undefined> }
    ).env = {
      ...(
        import.meta as unknown as { env?: Record<string, string | undefined> }
      ).env,
      VITE_MERCADOPAGO_PUBLIC_KEY: originalPublicKey,
    };
  });

  it("renders correctly", () => {
    render(
      <TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />
    );
    expect(screen.getByText("Comprar Ingressos")).toBeTruthy();
  });

  it("displays correct pricing", () => {
    render(
      <TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />
    );
    expect(screen.getAllByText(/R\$\s*100\.00/)[0]).toBeTruthy();
    expect(screen.getByText(/R\$\s*200\.00/)).toBeTruthy();
    expect(screen.getByText(/R\$\s*300\.00/)).toBeTruthy();
  });

  it("handles sold out ticket types", () => {
    render(
      <TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />
    );
    expect(screen.getAllByText("(Esgotado)")).toHaveLength(1);
  });

  it("disables purchase when inventory is insufficient", () => {
    const lowStockEvent = {
      ...mockEvent,
      inventory: { ...mockEvent.inventory, standard: 0 },
    };
    render(
      <TicketPurchase event={lowStockEvent} user={mockUser} onClose={vi.fn()} />
    );
    const button = screen.getByRole("button", { name: "Ir para Pagamento" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("calls createPreference when buy button is clicked", () => {
    (
      import.meta as unknown as { env?: Record<string, string | undefined> }
    ).env = {
      ...(
        import.meta as unknown as { env?: Record<string, string | undefined> }
      ).env,
      VITE_MERCADOPAGO_PUBLIC_KEY: "test-public-key",
    };
    render(
      <TicketPurchase event={mockEvent} user={mockUser} onClose={vi.fn()} />
    );
    const button = screen.getByRole("button", { name: "Ir para Pagamento" });
    fireEvent.click(button);
    expect(mockCreatePreference).toHaveBeenCalled();
  });
});
