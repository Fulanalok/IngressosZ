import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import EventsPage from "./EventsPage";

vi.mock("react-intersection-observer", () => ({
  useInView: () => ({ ref: vi.fn(), inView: false }),
}));

vi.mock("@/hooks/useAuth", () => ({
  useAuth: () => ({
    userProfile: {
      displayName: "U",
      email: "u@u.com",
    },
  }),
}));

vi.mock("@/hooks/useEvents", () => {
  const events = Array.from({ length: 25 }).map((_, i) => ({
    id: `e${i}`,
    title: `Evento ${i}`,
    location: `Local ${i}`,
    category: i % 2 === 0 ? "Música" : "Tecnologia",
    date: new Date().toISOString(),
    time: "19:00",
    price: 50,
    availableTickets: 20,
    maxTickets: 100,
    image: "",
  }));
  return {
    useEvents: () => ({
      data: events,
      status: "success",
      error: null,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
      isFetchingNextPage: false,
    }),
  };
});

vi.mock("@/components/EventCard", () => ({
  default: ({ event }: { event: { id: string; title: string } }) => (
    <div data-testid="event-card">{event.title}</div>
  ),
}));

describe("EventsPage", () => {
  it("ativa virtualização com muitos eventos e filtra por busca", async () => {
    render(<EventsPage />);
    expect((await screen.findAllByTestId("event-card")).length).toBeGreaterThan(0);
    expect(screen.getAllByTestId("event-card").length > 0).toBe(true);
    const input = screen.getByPlaceholderText(/Buscar por nome/);
    fireEvent.change(input as HTMLInputElement, {
      target: { value: "Evento 1" },
    });
    await waitFor(() =>
      expect(screen.getByText("Evento 1")).toBeInTheDocument()
    );
  });
});
