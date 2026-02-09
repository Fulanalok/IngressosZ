import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { postClientError } from "../services/logger";
import DocView from "./DocView";

vi.mock("../services/logger", () => ({
  postClientError: vi.fn(),
}));

describe("DocView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renderiza DocView com seções principais", async () => {
    render(
      <MemoryRouter>
        <DocView />
      </MemoryRouter>
    );
    expect(
      screen.getByText("Documentação do Sistema (DocView)")
    ).toBeInTheDocument();
    expect(screen.getByText("Arquitetura do Projeto")).toBeInTheDocument();
    expect(screen.getByText("Ambiente de Desenvolvimento")).toBeInTheDocument();
  });

  it("exibe status do ambiente", async () => {
    render(
      <MemoryRouter>
        <DocView />
      </MemoryRouter>
    );
    expect(screen.getByText(/Status:/i)).toBeInTheDocument();
    expect(screen.getByText(/Auth: porta 9099/i)).toBeInTheDocument();
  });

  it("envia log de teste ao clicar no botão", async () => {
    (postClientError as any).mockResolvedValue(undefined);

    render(
      <MemoryRouter>
        <DocView />
      </MemoryRouter>
    );

    const btn = screen.getByText(/Enviar Log de Teste/i);
    fireEvent.click(btn);

    await waitFor(() => {
      expect(screen.getByText(/Log enviado com sucesso!/i)).toBeInTheDocument();
    });

    expect(postClientError).toHaveBeenCalled();
  });

  it("trata erro ao enviar log", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    (postClientError as any).mockRejectedValue(new Error("Log falhou"));

    render(
      <MemoryRouter>
        <DocView />
      </MemoryRouter>
    );

    const btn = screen.getByText(/Enviar Log de Teste/i);
    fireEvent.click(btn);

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith(
        "Falha ao enviar log",
        expect.any(Error)
      );
    });
    consoleSpy.mockRestore();
  });

  it("trata erro ao carregar status", async () => {
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const OriginalDate = global.Date;

    // Mock Date to throw on toISOString which is called in load()
    global.Date = class extends OriginalDate {
      toISOString() {
        throw new Error("Date Error");
        return "";
      }
    } as any;

    render(
      <MemoryRouter>
        <DocView />
      </MemoryRouter>
    );

    await waitFor(() => {
      expect(consoleSpy).toHaveBeenCalledWith("Error: Date Error");
    });

    global.Date = OriginalDate;
    consoleSpy.mockRestore();
  });
});
