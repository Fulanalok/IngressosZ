import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { Event } from "../../types";
import { TicketPurchase } from "./TicketPurchase";

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
  createdAt: "2023-01-01",
  updatedAt: "2023-01-01",
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

const defaultProps = {
  event: mockEvent,
  selectedTicketType: "standard" as const,
  setSelectedTicketType: vi.fn(),
  quantity: 1,
  setQuantity: vi.fn(),
  handlePurchase: vi.fn(),
  checkoutLoading: false,
  paymentStatus: "idle" as const,
  checkoutError: null,
  totalPrice: 100,
};

describe("TicketPurchase Component", () => {
  it("renders correctly", () => {
    render(<TicketPurchase {...defaultProps} />);
    expect(screen.getByText("🎫 Comprar Ingressos")).toBeInTheDocument();
  });

  it("displays correct pricing", () => {
    render(<TicketPurchase {...defaultProps} />);
    // Standard: 100 (appears in list and potentially in total if selected)
    expect(screen.getAllByText(/R\$\s*100\.00/)[0]).toBeInTheDocument();
    // Vip: 200
    expect(screen.getByText(/R\$\s*200\.00/)).toBeInTheDocument();
    // Premium: 300
    expect(screen.getByText(/R\$\s*300\.00/)).toBeInTheDocument();
  });

  it("handles sold out ticket types", () => {
    render(<TicketPurchase {...defaultProps} />);
    // Premium is sold out (inventory: 0)
    expect(screen.getAllByText("(Esgotado)")).toHaveLength(1);
  });

  it("validates inventory", () => {
    // Create event with low stock for standard
    const lowStockEvent = {
      ...mockEvent,
      inventory: { ...mockEvent.inventory, standard: 2 },
    };

    // Try to buy 3 tickets
    render(
      <TicketPurchase {...defaultProps} event={lowStockEvent} quantity={3} />
    );

    // Button should be disabled
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveTextContent("❌ Ingressos insuficientes");
  });

  it("calls handlePurchase when buy button is clicked", () => {
    render(<TicketPurchase {...defaultProps} />);

    const button = screen.getByRole("button");
    expect(button).not.toBeDisabled();
    expect(button).toHaveTextContent(/Comprar/i);

    fireEvent.click(button);
    expect(defaultProps.handlePurchase).toHaveBeenCalled();
  });
});
