import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ValidationResult } from "./ValidationResult";

const ticketData = {
  eventTitle: "Rock in Rio 2026",
  ticketType: "VIP",
  holderName: "João Silva",
  eventDate: "15/06/2026",
  eventTime: "20:00",
};

describe("ValidationResult", () => {
  it("mostra placeholder quando status é null", () => {
    render(<ValidationResult status={null} message="" />);
    expect(screen.getByText("Digite um código de ingresso para validar")).toBeInTheDocument();
  });

  it("exibe badge VÁLIDO e mensagem no status success", () => {
    render(<ValidationResult status="success" message="Ingresso válido!" />);
    expect(screen.getByText("VÁLIDO")).toBeInTheDocument();
    expect(screen.getByText("Ingresso válido!")).toBeInTheDocument();
  });

  it("exibe badge USADO e mensagem no status error", () => {
    render(<ValidationResult status="error" message="Ingresso já utilizado." />);
    expect(screen.getByText("USADO")).toBeInTheDocument();
    expect(screen.getByText("Ingresso já utilizado.")).toBeInTheDocument();
  });

  it("exibe badge INVÁLIDO e mensagem no status invalid", () => {
    render(<ValidationResult status="invalid" message="QR Code inválido." />);
    expect(screen.getByText("INVÁLIDO")).toBeInTheDocument();
    expect(screen.getByText("QR Code inválido.")).toBeInTheDocument();
  });

  it("não exibe detalhes do ingresso quando status não é success", () => {
    render(<ValidationResult status="error" message="Erro" ticketData={ticketData} />);
    expect(screen.queryByText("Detalhes do Ingresso")).not.toBeInTheDocument();
    expect(screen.queryByText("Rock in Rio 2026")).not.toBeInTheDocument();
  });

  it("não exibe detalhes quando status é success mas ticketData não foi passado", () => {
    render(<ValidationResult status="success" message="Válido" />);
    expect(screen.queryByText("Detalhes do Ingresso")).not.toBeInTheDocument();
  });

  it("exibe todos os detalhes do ingresso quando status é success e ticketData foi passado", () => {
    render(
      <ValidationResult status="success" message="Ingresso válido!" ticketData={ticketData} />
    );
    expect(screen.getByText("Detalhes do Ingresso")).toBeInTheDocument();
    expect(screen.getByText("Rock in Rio 2026")).toBeInTheDocument();
    expect(screen.getByText("VIP")).toBeInTheDocument();
    expect(screen.getByText("João Silva")).toBeInTheDocument();
    expect(screen.getByText("15/06/2026")).toBeInTheDocument();
    expect(screen.getByText("20:00")).toBeInTheDocument();
  });

  it("exibe botão Confirmar Entrada quando status é success com ticketData", () => {
    render(
      <ValidationResult status="success" message="Válido" ticketData={ticketData} />
    );
    expect(screen.getByRole("button", { name: "Confirmar Entrada" })).toBeInTheDocument();
  });

  it("chama onConfirm ao clicar em Confirmar Entrada", () => {
    const onConfirm = vi.fn();
    render(
      <ValidationResult
        status="success"
        message="Válido"
        ticketData={ticketData}
        onConfirm={onConfirm}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Confirmar Entrada" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
  });

  it("não exibe botão Confirmar Entrada no status invalid", () => {
    render(
      <ValidationResult status="invalid" message="Inválido" ticketData={ticketData} />
    );
    expect(screen.queryByRole("button", { name: "Confirmar Entrada" })).not.toBeInTheDocument();
  });
});
