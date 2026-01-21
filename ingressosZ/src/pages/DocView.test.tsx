import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { expect, test, vi } from "vitest";
import DocView from "./DocView";

test("renderiza DocView com título", async () => {
  render(
    <MemoryRouter>
      <DocView />
    </MemoryRouter>
  );
  await screen.findByText("DocView");
  await screen.findByText("Arquitetura");
});

test("exibe status dos emuladores quando health responde", async () => {
  const spy = vi.spyOn(window, "fetch").mockResolvedValue({
    ok: true,
    status: 200,
    json: async () => ({
      emulator: true,
      firestoreEmulator: true,
      authEmulator: true,
      time: "2025-12-09T12:00:00Z",
    }),
  } as unknown as Response);
  render(
    <MemoryRouter>
      <DocView />
    </MemoryRouter>
  );
  await screen.findByText(/Status dos Emuladores/);
  await screen.findByText(/Emulador: ativo/);
  await screen.findByText(/Firestore: emulador/);
  await screen.findByText(/Auth: emulador/);
  expect(spy).toHaveBeenCalled();
});

test("envia log de teste ao clicar no botão", async () => {
  const spy = vi
    .spyOn(window, "fetch")
    .mockResolvedValue({ ok: true, status: 200 } as unknown as Response);
  render(
    <MemoryRouter>
      <DocView />
    </MemoryRouter>
  );
  const btn = await screen.findByText("Enviar log de teste");
  fireEvent.click(btn);
  await screen.findByText(/Log enviado/);
  expect(spy).toHaveBeenCalled();
});
