import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { MemoryRouter } from "react-router";
import PaymentCanceled from "./PaymentCanceled";

describe("PaymentCanceled", () => {
  it("renders canceled message and navigation links", () => {
    render(
      <MemoryRouter>
        <PaymentCanceled />
      </MemoryRouter>
    );

    expect(screen.getByText("Pagamento cancelado")).toBeInTheDocument();
    expect(
      screen.getByText(/Sua sessão de pagamento foi cancelada/i)
    ).toBeInTheDocument();
    
    const eventsLink = screen.getByRole("link", { name: /voltar aos eventos/i });
    expect(eventsLink).toHaveAttribute("href", "/eventos");

    const ticketsLink = screen.getByRole("link", { name: /meus ingressos/i });
    expect(ticketsLink).toHaveAttribute("href", "/meus-ingressos");
  });
});
