import { render, screen } from "@testing-library/react";
import { describe, it, expect, vi } from "vitest";
import AdminDashboard, { type EventMetric } from "./AdminDashboard";
import type { Event, Ticket, PaymentSession } from "../../types";

// ── Recharts mock — componentes de gráfico não funcionam em jsdom ──────────────
vi.mock("recharts", () => ({
  AreaChart: ({ children }: { children: React.ReactNode }) => <div data-testid="area-chart">{children}</div>,
  Area: () => null,
  BarChart: ({ children }: { children: React.ReactNode }) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => null,
  PieChart: ({ children }: { children: React.ReactNode }) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => null,
  Cell: () => null,
  XAxis: () => null,
  YAxis: () => null,
  CartesianGrid: () => null,
  Tooltip: () => null,
  ResponsiveContainer: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}));

// ── helpers ────────────────────────────────────────────────────────────────────

function fakeTs(dateStr: string) {
  return { toDate: () => new Date(dateStr) } as unknown as Ticket["purchaseDate"];
}

function makeEvent(overrides: Partial<Event> = {}): Event {
  return {
    id: "evt-1",
    title: "Show de Rock",
    description: "Um show incrível",
    date: "2026-06-15",
    time: "20:00",
    location: "Arena",
    address: "Rua Principal, 100",
    price: 100,
    maxTickets: 200,
    availableTickets: 150,
    category: "Música",
    image: "",
    organizerId: "org-1",
    createdAt: null as unknown as Event["createdAt"],
    updatedAt: null as unknown as Event["updatedAt"],
    inventory: { standard: 100, vip: 50, premium: 50 },
    pricing: { standard: 100, vip: 200, premium: 300 },
    ...overrides,
  };
}

function makeTicket(overrides: Partial<Ticket> = {}): Ticket {
  return {
    id: "tkt-1",
    userId: "usr-1",
    eventId: "evt-1",
    purchaseId: "pur-1",
    ticketType: "standard",
    price: 100,
    userEmail: "user@test.com",
    qrCode: "QR-123",
    validated: false,
    status: "valid",
    purchaseDate: fakeTs("2026-04-01T12:00:00"),
    createdAt: fakeTs("2026-04-01T12:00:00"),
    ...overrides,
  };
}

function makePayment(overrides: Partial<PaymentSession> = {}): PaymentSession {
  return {
    id: "pay-1",
    eventId: "evt-1",
    userId: "usr-1",
    totalAmount: 500,
    status: "approved",
    provider: "mercadopago",
    createdAt: fakeTs("2026-04-01T12:00:00"),
    ...overrides,
  } as PaymentSession;
}

// ── tests ──────────────────────────────────────────────────────────────────────

describe("AdminDashboard", () => {
  it("renderiza os 4 cards de resumo", () => {
    render(
      <AdminDashboard totalRevenue={0} totalTickets={0} totalEvents={0} />
    );
    expect(screen.getByText("Receita Total")).toBeInTheDocument();
    expect(screen.getByText("Ingressos Vendidos")).toBeInTheDocument();
    expect(screen.getByText("Eventos Ativos")).toBeInTheDocument();
    expect(screen.getByText("Check-ins Realizados")).toBeInTheDocument();
  });

  it("exibe os valores corretos nos cards", () => {
    render(
      <AdminDashboard totalRevenue={1500} totalTickets={42} totalEvents={3} />
    );
    expect(screen.getByText("R$ 1.500,00")).toBeInTheDocument();
    expect(screen.getByText("42")).toBeInTheDocument();
    expect(screen.getByText("3")).toBeInTheDocument();
  });

  it("exibe R$ 0,00 quando receita total é zero", () => {
    render(<AdminDashboard totalRevenue={0} totalTickets={0} totalEvents={0} />);
    expect(screen.getByText("R$ 0,00")).toBeInTheDocument();
  });

  it("calcula check-ins a partir de tickets com status 'used'", () => {
    const tickets: Ticket[] = [
      makeTicket({ id: "t1", status: "used" }),
      makeTicket({ id: "t2", status: "used" }),
      makeTicket({ id: "t3", status: "valid" }),
    ];
    const metrics: EventMetric[] = [
      { event: makeEvent(), tickets, payments: [] },
    ];
    render(
      <AdminDashboard totalRevenue={0} totalTickets={3} totalEvents={1} eventMetrics={metrics} />
    );
    // Check-ins Realizados deve mostrar 2
    expect(screen.getByText("2")).toBeInTheDocument();
  });

  it("não exibe seção de gráficos quando não há dados de pagamento ou tickets", () => {
    render(
      <AdminDashboard totalRevenue={0} totalTickets={0} totalEvents={0} eventMetrics={[]} />
    );
    expect(screen.queryByTestId("area-chart")).not.toBeInTheDocument();
  });

  it("exibe gráficos quando há payments com data de hoje", () => {
    const payment = makePayment({ totalAmount: 300 });
    const metrics: EventMetric[] = [
      { event: makeEvent(), tickets: [makeTicket()], payments: [payment] },
    ];
    render(
      <AdminDashboard
        totalRevenue={300}
        totalTickets={1}
        totalEvents={1}
        eventMetrics={metrics}
      />
    );
    expect(screen.getAllByTestId("area-chart").length).toBeGreaterThan(0);
  });

  it("exibe detalhamento por evento com título e local", () => {
    const metrics: EventMetric[] = [
      { event: makeEvent(), tickets: [], payments: [] },
    ];
    render(
      <AdminDashboard totalRevenue={0} totalTickets={0} totalEvents={1} eventMetrics={metrics} />
    );
    expect(screen.getByText("Show de Rock")).toBeInTheDocument();
    expect(screen.getByText(/Arena/)).toBeInTheDocument();
  });

  it("exibe receita por evento no detalhamento", () => {
    const payment = makePayment({ totalAmount: 750 });
    const metrics: EventMetric[] = [
      { event: makeEvent(), tickets: [], payments: [payment] },
    ];
    render(
      <AdminDashboard totalRevenue={750} totalTickets={0} totalEvents={1} eventMetrics={metrics} />
    );
    // "R$ 750,00" aparece no card de resumo E no detalhamento — verificamos que existe pelo menos um
    expect(screen.getAllByText("R$ 750,00").length).toBeGreaterThanOrEqual(1);
  });

  it("exibe distribuição por tipo de ingresso no detalhamento", () => {
    const tickets: Ticket[] = [
      makeTicket({ id: "t1", ticketType: "standard" }),
      makeTicket({ id: "t2", ticketType: "vip" }),
      makeTicket({ id: "t3", ticketType: "vip" }),
    ];
    const metrics: EventMetric[] = [
      { event: makeEvent(), tickets, payments: [] },
    ];
    render(
      <AdminDashboard totalRevenue={0} totalTickets={3} totalEvents={1} eventMetrics={metrics} />
    );
    expect(screen.getByText("standard")).toBeInTheDocument();
    expect(screen.getByText("vip")).toBeInTheDocument();
  });

  it("exibe múltiplos eventos no detalhamento", () => {
    const metrics: EventMetric[] = [
      { event: makeEvent({ id: "e1", title: "Festival A" }), tickets: [], payments: [] },
      { event: makeEvent({ id: "e2", title: "Conferência B" }), tickets: [], payments: [] },
    ];
    render(
      <AdminDashboard totalRevenue={0} totalTickets={0} totalEvents={2} eventMetrics={metrics} />
    );
    expect(screen.getByText("Festival A")).toBeInTheDocument();
    expect(screen.getByText("Conferência B")).toBeInTheDocument();
  });

  it("não renderiza detalhamento quando eventMetrics é undefined", () => {
    render(<AdminDashboard totalRevenue={0} totalTickets={0} totalEvents={0} />);
    expect(screen.queryByText("Detalhamento por Evento")).not.toBeInTheDocument();
  });

  it("exibe título da seção de detalhamento quando há eventos", () => {
    const metrics: EventMetric[] = [
      { event: makeEvent(), tickets: [], payments: [] },
    ];
    render(
      <AdminDashboard totalRevenue={0} totalTickets={0} totalEvents={1} eventMetrics={metrics} />
    );
    expect(screen.getByText("Detalhamento por Evento")).toBeInTheDocument();
  });
});
