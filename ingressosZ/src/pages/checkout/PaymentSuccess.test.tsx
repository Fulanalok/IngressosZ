import { render, screen } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it } from "vitest";
import PaymentSuccess from "./PaymentSuccess";

describe("PaymentSuccess", () => {
  it("renders success message and session ID", () => {
    const sessionId = "sess_12345";
    render(
      <MemoryRouter initialEntries={[`/sucesso/${sessionId}`]}>
        <Routes>
          <Route path="/sucesso/:sessionId" element={<PaymentSuccess />} />
        </Routes>
      </MemoryRouter>
    );

    expect(screen.getByText("Pagamento concluído")).toBeInTheDocument();
    expect(screen.getByText(/Obrigado pela compra/i)).toBeInTheDocument();
    expect(screen.getByText(`Sessão: ${sessionId}`)).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ver meus ingressos/i })
    ).toHaveAttribute("href", "/meus-ingressos");
  });

  it("renders without session ID if not present (though route usually requires it, checking safe render)", () => {
    render(
      <MemoryRouter>
        <PaymentSuccess />
      </MemoryRouter>
    );

    expect(screen.getByText("Pagamento concluído")).toBeInTheDocument();
    // Should not show session ID text if param is missing/undefined
    expect(screen.queryByText(/Sessão:/)).not.toBeInTheDocument();
  });
});
