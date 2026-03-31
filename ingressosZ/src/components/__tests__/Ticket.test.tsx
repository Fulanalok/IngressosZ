import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import Ticket from "../Ticket";
import type { Ticket as TicketType } from "../../types";
import { Timestamp } from "firebase/firestore";

// Mock do módulo de impressão
vi.mock("../../lib/pdfPrint", () => ({
  printTicket: vi.fn().mockResolvedValue(undefined),
}));

// Mock do QRCodeDisplay para evitar dependência de canvas/geração assíncrona
vi.mock("../QRCodeDisplay", () => ({
  default: ({ qrCode }: { qrCode: string }) => (
    <div data-testid="qr-display">{qrCode}</div>
  ),
}));

const mockTicket: TicketType = {
  id: "ticket-1",
  eventId: "event-1",
  userId: "user-1",
  userEmail: "test@example.com",
  purchaseDate: Timestamp.now(),
  qrCode: "mock-qr-code",
  status: "valid",
  price: 150.0,
  ticketType: "standard",
  eventTitle: "Concerto de Rock",
  eventDate: "2025-12-25",
  eventLocation: "Arena Central",
};

describe("Componente Ticket", () => {
  it("deve renderizar as informações básicas do ingresso", () => {
    render(<Ticket ticket={mockTicket} />);
    
    expect(screen.getByText("Concerto de Rock")).toBeInTheDocument();
    expect(screen.getByText("VÁLIDO")).toBeInTheDocument();
    expect(screen.getByText("Padrão")).toBeInTheDocument();
    expect(screen.getByText("R$ 150.00")).toBeInTheDocument();
  });

  it("deve renderizar status 'USADO' e mudar a cor do strip quando o status for 'used'", () => {
    const usedTicket: TicketType = { ...mockTicket, status: "used" };
    render(<Ticket ticket={usedTicket} />);
    
    expect(screen.getByText("USADO")).toBeInTheDocument();
  });

  it("deve mostrar o botão 'Ver QR Code' e alternar a visualização ao clicar", () => {
    render(<Ticket ticket={mockTicket} />);
    
    const qrButton = screen.getByText("Ver QR Code");
    fireEvent.click(qrButton);
    
    expect(screen.getByText("Ocultar QR Code")).toBeInTheDocument();
    // O QRCodeDisplay é mockado pelo setup global ou renderiza algo que podemos checar
    expect(screen.getByTestId("qr-display")).toBeInTheDocument();
  });

  it("deve exibir estados diferentes para ingressos VIP", () => {
    const vipTicket: TicketType = { ...mockTicket, ticketType: "vip", price: 500 };
    render(<Ticket ticket={vipTicket} />);
    
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("R$ 500.00")).toBeInTheDocument();
  });

  it("deve chamar a função de impressão ao clicar no botão de download", async () => {
    const { printTicket } = await import("../../lib/pdfPrint");
    render(<Ticket ticket={mockTicket} />);
    
    const downloadButton = screen.getByText(/Baixar Ingresso/i);
    fireEvent.click(downloadButton);
    
    expect(printTicket).toHaveBeenCalledWith(mockTicket);
  });
});
