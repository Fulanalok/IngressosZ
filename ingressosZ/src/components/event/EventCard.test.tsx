import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen } from "@testing-library/react";
import { Timestamp } from "firebase/firestore";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import type { Event } from "../types";
import EventCard from "./EventCard";

vi.mock("../services/firestore", () => ({
  eventService: { getEventById: vi.fn() },
}));

const baseEvent: Event = {
  id: "e1",
  title: "Rock Festival",
  description: "Um grande festival",
  date: "2024-06-15T12:00:00", // explicit noon avoids timezone off-by-one at midnight UTC
  time: "20:00",
  location: "Arena SP",
  address: "Rua X, 100",
  price: 150,
  maxTickets: 200,
  availableTickets: 50,
  category: "Música",
  organizerId: "org1",
  image: "https://img.example.com/rock.jpg",
  pricing: { standard: 150, vip: 300, premium: 450 },
  createdAt: Timestamp.fromDate(new Date("2024-01-01")),
  updatedAt: Timestamp.fromDate(new Date("2024-01-01")),
};

function renderCard(event: Event) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: 0 } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <EventCard event={event} />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("EventCard Component", () => {
  it("exibe título do evento", () => {
    renderCard(baseEvent);
    expect(screen.getByText("Rock Festival")).toBeInTheDocument();
  });

  it("exibe data formatada no padrão pt-BR", () => {
    renderCard(baseEvent);
    expect(screen.getByText("15/06/2024")).toBeInTheDocument();
  });

  it("exibe horário truncado em HH:MM", () => {
    renderCard({ ...baseEvent, time: "20:00:00" });
    expect(screen.getByText("20:00")).toBeInTheDocument();
  });

  it("exibe localização do evento", () => {
    renderCard(baseEvent);
    expect(screen.getByText("Arena SP")).toBeInTheDocument();
  });

  it("exibe preço via pricing.standard", () => {
    renderCard(baseEvent);
    expect(screen.getByText("R$ 150.00")).toBeInTheDocument();
  });

  it("exibe preço via event.price quando pricing não existe", () => {
    const { pricing: _, ...withoutPricing } = baseEvent;
    renderCard({ ...withoutPricing, price: 99 } as Event);
    expect(screen.getByText("R$ 99.00")).toBeInTheDocument();
  });

  it("exibe categoria do evento", () => {
    renderCard(baseEvent);
    expect(screen.getByText("Música")).toBeInTheDocument();
  });

  it("exibe badge 'Últimos ingressos!' quando availableTickets <= 10 e > 0", () => {
    renderCard({ ...baseEvent, availableTickets: 5 });
    expect(screen.getByText("Últimos ingressos!")).toBeInTheDocument();
  });

  it("não exibe badge 'Últimos ingressos!' quando availableTickets > 10", () => {
    renderCard(baseEvent);
    expect(screen.queryByText("Últimos ingressos!")).not.toBeInTheDocument();
  });

  it("exibe 'Esgotado' quando availableTickets === 0", () => {
    renderCard({ ...baseEvent, availableTickets: 0 });
    expect(screen.getByText("Esgotado")).toBeInTheDocument();
  });

  it("exibe 'Ver Detalhes & Comprar' quando há ingressos disponíveis", () => {
    renderCard(baseEvent);
    expect(screen.getByText("Ver Detalhes & Comprar")).toBeInTheDocument();
  });

  it("não exibe imagem quando event.image não está definido", () => {
    const { image: _, ...withoutImage } = baseEvent;
    renderCard(withoutImage as Event);
    expect(screen.queryByRole("img")).not.toBeInTheDocument();
  });
});
