import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import QRTestPage from "./QRTestPage";

// Mock router
vi.mock("react-router-dom", () => ({
  Link: ({ children, to }: { children: React.ReactNode; to: string }) => (
    <a href={to}>{children}</a>
  ),
}));

// Mock child components
vi.mock("../components/CameraTest", () => ({
  default: () => <div data-testid="camera-test">Camera Test Component</div>,
}));

vi.mock("../components/QRGenerator", () => ({
  default: () => <div data-testid="qr-generator">QR Generator Component</div>,
}));

vi.mock("../components/QRTestDisplay", () => ({
  default: ({ ticketId, eventId }: any) => (
    <div data-testid="qr-test-display">
      Display: {ticketId} - {eventId}
    </div>
  ),
}));

describe("QRTestPage", () => {
  it("renders all sections correctly", () => {
    render(<QRTestPage />);
    
    // Header
    expect(screen.getByText("Teste de QR Codes")).toBeInTheDocument();
    
    // Child components
    expect(screen.getByTestId("camera-test")).toBeInTheDocument();
    expect(screen.getByTestId("qr-generator")).toBeInTheDocument();
    expect(screen.getByTestId("qr-test-display")).toHaveTextContent("test-ticket-123");
    
    // Instructions
    expect(screen.getByText("Como Testar")).toBeInTheDocument();
    expect(screen.getByText("Abrir Nova Aba")).toBeInTheDocument();
    expect(screen.getByText("Iniciar Scanner")).toBeInTheDocument();
    
    // Link to validator
    const validatorLink = screen.getByText((content) => content.includes("Ir para o Validador"));
    expect(validatorLink.closest("a")).toHaveAttribute("href", "/validador");
  });
});
