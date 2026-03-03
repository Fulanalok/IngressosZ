import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import DocView from "./DocView";

vi.mock("../services/logger", () => ({
  postClientError: vi.fn(async () => {}),
}));

test("renderiza DocView com título", async () => {
  render(
    <MemoryRouter>
      <DocView />
    </MemoryRouter>
  );
  await screen.findByText("Documentação do Sistema (DocView)");
  await screen.findByText("Arquitetura do Projeto");
});

test("exibe status do ambiente", async () => {
  render(
    <MemoryRouter>
      <DocView />
    </MemoryRouter>
  );
  await screen.findByText("Ambiente de Desenvolvimento");
  await screen.findByText(/Última verificação:/);
});

test("envia log de teste ao clicar no botão", async () => {
  render(
    <MemoryRouter>
      <DocView />
    </MemoryRouter>
  );
  const btn = await screen.findByText("Enviar Log de Teste");
  fireEvent.click(btn);
  await screen.findByText(/Log enviado com sucesso/);
});
