import { render, screen, fireEvent } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import { ValidatorForm } from "./ValidatorForm";
import type { UserProfile } from "../../types";

function makeProfile(role: string): UserProfile {
  return {
    uid: "uid-1",
    email: "test@test.com",
    displayName: "Tester",
    role: role as UserProfile["role"],
    createdAt: null as unknown as UserProfile["createdAt"],
  };
}

const baseProps = {
  ticketCode: "",
  setTicketCode: vi.fn(),
  onSubmit: vi.fn((e: React.FormEvent) => e.preventDefault()),
  isValidating: false,
  onReset: vi.fn(),
  validationStatus: null as null,
  generateTestCode: vi.fn(),
  createTestData: vi.fn(),
  isCreatingTestData: false,
};

describe("ValidatorForm", () => {
  it("renderiza campo de código e botão Validar Ingresso", () => {
    render(<ValidatorForm {...baseProps} userProfile={makeProfile("validator")} />);
    expect(screen.getByLabelText("Código do Ingresso")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Validar Ingresso/i })).toBeInTheDocument();
  });

  it("botão Validar desabilitado quando código está vazio", () => {
    render(<ValidatorForm {...baseProps} userProfile={makeProfile("validator")} />);
    expect(screen.getByRole("button", { name: /Validar Ingresso/i })).toBeDisabled();
  });

  it("botão Validar desabilitado para role 'user'", () => {
    render(
      <ValidatorForm
        {...baseProps}
        ticketCode="TICKET-123"
        userProfile={makeProfile("user")}
      />
    );
    expect(screen.getByRole("button", { name: /Validar Ingresso/i })).toBeDisabled();
  });

  it("botão Validar habilitado para validator com código preenchido", () => {
    render(
      <ValidatorForm
        {...baseProps}
        ticketCode="TICKET-123"
        userProfile={makeProfile("validator")}
      />
    );
    expect(screen.getByRole("button", { name: /Validar Ingresso/i })).toBeEnabled();
  });

  it("botão Validar habilitado para organizer com código preenchido", () => {
    render(
      <ValidatorForm
        {...baseProps}
        ticketCode="TICKET-123"
        userProfile={makeProfile("organizer")}
      />
    );
    expect(screen.getByRole("button", { name: /Validar Ingresso/i })).toBeEnabled();
  });

  it("chama setTicketCode ao digitar no campo", () => {
    const setTicketCode = vi.fn();
    render(
      <ValidatorForm
        {...baseProps}
        setTicketCode={setTicketCode}
        userProfile={makeProfile("validator")}
      />
    );
    fireEvent.change(screen.getByLabelText("Código do Ingresso"), {
      target: { value: "TICKET-ABC" },
    });
    expect(setTicketCode).toHaveBeenCalledWith("TICKET-ABC");
  });

  it("chama onSubmit ao submeter o formulário com código", () => {
    const onSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    render(
      <ValidatorForm
        {...baseProps}
        ticketCode="TICKET-123"
        onSubmit={onSubmit}
        userProfile={makeProfile("validator")}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Validar Ingresso/i }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
  });

  it("exibe 'Validando...' e desabilita botão quando isValidating é true", () => {
    render(
      <ValidatorForm
        {...baseProps}
        ticketCode="TICKET-123"
        isValidating={true}
        userProfile={makeProfile("validator")}
      />
    );
    expect(screen.getByText("Validando...")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Validando/i })).toBeDisabled();
  });

  it("campo de código desabilitado durante validação", () => {
    render(
      <ValidatorForm
        {...baseProps}
        isValidating={true}
        userProfile={makeProfile("validator")}
      />
    );
    expect(screen.getByLabelText("Código do Ingresso")).toBeDisabled();
  });

  it("chama onReset ao clicar no botão de limpar", () => {
    const onReset = vi.fn();
    render(
      <ValidatorForm {...baseProps} onReset={onReset} userProfile={makeProfile("validator")} />
    );
    // Reset button has sr-only text "Limpar código"
    fireEvent.click(screen.getByRole("button", { name: /Limpar código/i }));
    expect(onReset).toHaveBeenCalledTimes(1);
  });

  it("exibe botão 'Código Teste' nas Ações Rápidas", () => {
    render(<ValidatorForm {...baseProps} userProfile={makeProfile("validator")} />);
    expect(screen.getByRole("button", { name: "Código Teste" })).toBeInTheDocument();
  });

  it("chama generateTestCode ao clicar em 'Código Teste'", () => {
    const generateTestCode = vi.fn();
    render(
      <ValidatorForm
        {...baseProps}
        generateTestCode={generateTestCode}
        userProfile={makeProfile("validator")}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: "Código Teste" }));
    expect(generateTestCode).toHaveBeenCalledTimes(1);
  });

  it("exibe botão 'Criar Dados' para roles não-user", () => {
    render(<ValidatorForm {...baseProps} userProfile={makeProfile("organizer")} />);
    expect(screen.getByRole("button", { name: /Criar Dados/i })).toBeInTheDocument();
  });

  it("não exibe botão 'Criar Dados' para role user", () => {
    render(<ValidatorForm {...baseProps} userProfile={makeProfile("user")} />);
    expect(screen.queryByRole("button", { name: /Criar Dados/i })).not.toBeInTheDocument();
  });

  it("exibe 'Criando...' e desabilita botão Criar Dados quando isCreatingTestData é true", () => {
    render(
      <ValidatorForm
        {...baseProps}
        isCreatingTestData={true}
        userProfile={makeProfile("admin")}
      />
    );
    expect(screen.getByRole("button", { name: /Criando/i })).toBeDisabled();
  });

  it("chama createTestData ao clicar em 'Criar Dados'", () => {
    const createTestData = vi.fn();
    render(
      <ValidatorForm
        {...baseProps}
        createTestData={createTestData}
        userProfile={makeProfile("validator")}
      />
    );
    fireEvent.click(screen.getByRole("button", { name: /Criar Dados/i }));
    expect(createTestData).toHaveBeenCalledTimes(1);
  });
});
