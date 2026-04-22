import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import PaymentCanceled from "./PaymentCanceled";
import PaymentSuccess from "./PaymentSuccess";

// Mock router
vi.mock("react-router-dom", () => ({
  useParams: () => ({ sessionId: "sess_123" }),
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

describe("Payment Pages", () => {
  describe("PaymentSuccess", () => {
    it("renders success message and session id", () => {
      render(<PaymentSuccess />);
      expect(screen.getByText("Pagamento concluído")).toBeInTheDocument();
      expect(screen.getByText(/Obrigado pela compra!/i)).toBeInTheDocument();
      expect(screen.getByText("Sessão: sess_123")).toBeInTheDocument();
      expect(screen.getByText("Ver meus ingressos")).toHaveAttribute("href", "/meus-ingressos");
    });
  });

  describe("PaymentCanceled", () => {
    it("renders canceled message", () => {
      render(<PaymentCanceled />);
      expect(screen.getByText("Pagamento cancelado")).toBeInTheDocument();
      expect(screen.getByText(/foi cancelada/i)).toBeInTheDocument();
      expect(screen.getByText("Voltar aos eventos")).toHaveAttribute("href", "/eventos");
      expect(screen.getByText("Meus ingressos")).toHaveAttribute("href", "/meus-ingressos");
    });
  });
});
