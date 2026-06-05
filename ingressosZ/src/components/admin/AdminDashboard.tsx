import { useMemo } from "react";
import { DollarSign, Users, Calendar, CheckCircle, TrendingUp } from "lucide-react";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import type { Event, Ticket, PaymentSession } from "../../types";

export interface EventMetric {
  event: Event;
  tickets: Ticket[];
  payments: PaymentSession[];
}

interface AdminDashboardProps {
  totalRevenue: number;
  totalTickets: number;
  totalEvents: number;
  eventMetrics?: EventMetric[];
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatBRL(value: number) {
  return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}

function formatBRLShort(value: number) {
  if (value >= 1000) return `R$ ${(value / 1000).toFixed(1)}k`;
  return `R$ ${value.toFixed(0)}`;
}

const TICKET_COLORS: Record<string, string> = {
  standard: "#94a3b8",
  vip: "#fbbf24",
  premium: "#a855f7",
};

// ─── sub-components ────────────────────────────────────────────────────────────

function CheckinProgress({ tickets }: { tickets: Ticket[] }) {
  const total = tickets.length;
  const used = tickets.filter((t) => t.status === "used").length;
  const pct = total > 0 ? Math.round((used / total) * 100) : 0;
  return (
    <div className="flex flex-col gap-1">
      <div className="flex justify-between text-[11px] text-muted-foreground font-medium">
        <span>Check-in</span>
        <span className="font-bold text-foreground">
          {used}/{total}
        </span>
      </div>
      <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
        <div className="h-full bg-blue-500" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-[10px] text-muted-foreground">{pct}% validado</span>
    </div>
  );
}

function TypeBreakdown({ tickets }: { tickets: Ticket[] }) {
  const types = ["standard", "vip", "premium"] as const;
  const counts = types
    .map((t) => ({
      type: t,
      count: tickets.filter((tk) => tk.ticketType === t).length,
      revenue: tickets
        .filter((tk) => tk.ticketType === t)
        .reduce((acc, tk) => acc + (tk.price || 0), 0),
    }))
    .filter((t) => t.count > 0);

  if (counts.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1">
      {counts.map(({ type, count, revenue }) => (
        <div key={type} className="flex items-center gap-1 text-[11px]">
          <div className="w-2 h-2 rounded-full" style={{ background: TICKET_COLORS[type] }} />
          <span className="capitalize text-muted-foreground">{type}</span>
          <span className="font-semibold">{count}</span>
          <span className="text-muted-foreground">
            · R$ {revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })}
          </span>
        </div>
      ))}
    </div>
  );
}

// Custom tooltip for area/bar charts
function RevenueTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold mb-0.5">{label}</p>
      <p className="text-primary font-bold">{formatBRL(payload[0].value)}</p>
    </div>
  );
}

function TicketsTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { value: number }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="font-semibold mb-0.5">{label}</p>
      <p className="text-blue-500 font-bold">{payload[0].value} ingressos</p>
    </div>
  );
}

function PieTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { name: string; value: number; payload: { pct: number } }[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm">
      <p className="capitalize font-semibold">{payload[0].name}</p>
      <p className="text-foreground">{payload[0].value} ingressos</p>
      <p className="text-muted-foreground">{payload[0].payload.pct}%</p>
    </div>
  );
}

// ─── main component ────────────────────────────────────────────────────────────

export default function AdminDashboard({
  totalRevenue,
  totalTickets,
  totalEvents,
  eventMetrics,
}: AdminDashboardProps) {
  const allPayments = useMemo(
    () => eventMetrics?.flatMap((m) => m.payments) ?? [],
    [eventMetrics]
  );
  const allTickets = useMemo(
    () => eventMetrics?.flatMap((m) => m.tickets) ?? [],
    [eventMetrics]
  );

  const totalCheckins = allTickets.filter((t) => t.status === "used").length;

  // Revenue over last 30 days grouped by day
  const revenueByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[key] = 0;
    }
    allPayments.forEach((p) => {
      const ts = (p.createdAt as { toDate?: () => Date } | null)?.toDate?.();
      if (!ts) return;
      const key = ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (key in days) days[key] += p.totalAmount || 0;
    });
    return Object.entries(days).map(([date, revenue]) => ({ date, revenue }));
  }, [allPayments]);

  // Tickets sold per day (last 30)
  const ticketsByDay = useMemo(() => {
    const days: Record<string, number> = {};
    const now = Date.now();
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 86400000);
      const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      days[key] = 0;
    }
    allTickets.forEach((t) => {
      const ts = (t.purchaseDate as { toDate?: () => Date } | null)?.toDate?.();
      if (!ts) return;
      const key = ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
      if (key in days) days[key] += 1;
    });
    return Object.entries(days).map(([date, tickets]) => ({ date, tickets }));
  }, [allTickets]);

  // Revenue per event (bar chart)
  const revenueByEvent = useMemo(() => {
    return (
      eventMetrics
        ?.map(({ event, payments }) => ({
          name:
            event.title.length > 18 ? event.title.slice(0, 18) + "…" : event.title,
          revenue: payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        }))
        .filter((e) => e.revenue > 0)
        .sort((a, b) => b.revenue - a.revenue)
        .slice(0, 8) ?? []
    );
  }, [eventMetrics]);

  // Ticket type distribution (pie)
  const typeDistribution = useMemo(() => {
    const counts = { standard: 0, vip: 0, premium: 0 };
    allTickets.forEach((t) => {
      if (t.ticketType in counts)
        counts[t.ticketType as keyof typeof counts]++;
    });
    const total = Object.values(counts).reduce((a, b) => a + b, 0);
    return Object.entries(counts)
      .filter(([, v]) => v > 0)
      .map(([type, value]) => ({
        name: type === "standard" ? "Padrão" : type === "vip" ? "VIP" : "Premium",
        value,
        pct: total > 0 ? Math.round((value / total) * 100) : 0,
        color: TICKET_COLORS[type],
      }));
  }, [allTickets]);

  const summaryCards = [
    {
      title: "Receita Total",
      value: formatBRL(totalRevenue),
      icon: DollarSign,
      color: "text-primary",
      bg: "bg-primary/10",
    },
    {
      title: "Ingressos Vendidos",
      value: totalTickets.toString(),
      icon: Users,
      color: "text-blue-500",
      bg: "bg-blue-500/10",
    },
    {
      title: "Eventos Ativos",
      value: totalEvents.toString(),
      icon: Calendar,
      color: "text-blue-400",
      bg: "bg-blue-400/10",
    },
    {
      title: "Check-ins Realizados",
      value: totalCheckins.toString(),
      icon: CheckCircle,
      color: "text-sky-500",
      bg: "bg-sky-500/10",
    },
  ];

  const hasChartData =
    revenueByDay.some((d) => d.revenue > 0) ||
    ticketsByDay.some((d) => d.tickets > 0);

  return (
    <div className="mb-8 space-y-6">
      {/* Summary cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {summaryCards.map((card) => (
          <div
            key={card.title}
            className="bg-card border rounded-xl p-5 shadow-sm flex items-center gap-4"
          >
            <div className={`${card.bg} p-3 rounded-full shrink-0`}>
              <card.icon className={`h-5 w-5 ${card.color}`} />
            </div>
            <div>
              <p className="text-xs text-muted-foreground">{card.title}</p>
              <h3 className="text-xl font-bold leading-tight">{card.value}</h3>
            </div>
          </div>
        ))}
      </div>

      {/* Charts row */}
      {hasChartData && (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* Area: Revenue over time */}
            <div className="lg:col-span-2 bg-card border rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <TrendingUp className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-semibold">Faturamento — últimos 30 dias</h3>
              </div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={revenueByDay} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval={6}
                  />
                  <YAxis
                    tickFormatter={formatBRLShort}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={60}
                  />
                  <Tooltip content={<RevenueTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="revenue"
                    stroke="#2563eb"
                    strokeWidth={2}
                    fill="transparent"
                    dot={false}
                    activeDot={{ r: 4, fill: "#2563eb" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Pie: Ticket type distribution */}
            <div className="bg-card border rounded-xl p-5 shadow-sm flex flex-col">
              <h3 className="text-sm font-semibold mb-4">Distribuição por Tipo</h3>
              {typeDistribution.length > 0 ? (
                <>
                  <ResponsiveContainer width="100%" height={140}>
                    <PieChart>
                      <Pie
                        data={typeDistribution}
                        cx="50%"
                        cy="50%"
                        innerRadius={42}
                        outerRadius={65}
                        paddingAngle={3}
                        dataKey="value"
                      >
                        {typeDistribution.map((entry) => (
                          <Cell key={entry.name} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip content={<PieTooltip />} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="flex flex-col gap-1.5 mt-2">
                    {typeDistribution.map((entry) => (
                      <div key={entry.name} className="flex items-center justify-between text-xs">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2.5 h-2.5 rounded-full" style={{ background: entry.color }} />
                          <span className="text-muted-foreground">{entry.name}</span>
                        </div>
                        <span className="font-semibold">
                          {entry.value}{" "}
                          <span className="text-muted-foreground font-normal">({entry.pct}%)</span>
                        </span>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
                  Sem dados de ingressos
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Bar: Tickets sold per day */}
            <div className="bg-card border rounded-xl p-5 shadow-sm">
              <h3 className="text-sm font-semibold mb-4">Ingressos vendidos — últimos 30 dias</h3>
              <ResponsiveContainer width="100%" height={160}>
                <AreaChart data={ticketsByDay} margin={{ top: 4, right: 4, bottom: 0, left: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    interval={6}
                  />
                  <YAxis
                    allowDecimals={false}
                    tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                    tickLine={false}
                    axisLine={false}
                    width={30}
                  />
                  <Tooltip content={<TicketsTooltip />} />
                  <Area
                    type="monotone"
                    dataKey="tickets"
                    stroke="#3b82f6"
                    strokeWidth={2}
                    fill="transparent"
                    dot={false}
                    activeDot={{ r: 4, fill: "#3b82f6" }}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            {/* Bar: Revenue by event */}
            {revenueByEvent.length > 0 && (
              <div className="bg-card border rounded-xl p-5 shadow-sm">
                <h3 className="text-sm font-semibold mb-4">Faturamento por Evento</h3>
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart
                    data={revenueByEvent}
                    margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
                    layout="vertical"
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
                    <XAxis
                      type="number"
                      tickFormatter={formatBRLShort}
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      tick={{ fontSize: 10, fill: "hsl(var(--muted-foreground))" }}
                      tickLine={false}
                      axisLine={false}
                      width={90}
                    />
                    <Tooltip content={<RevenueTooltip />} />
                    <Bar dataKey="revenue" fill="#2563eb" radius={[0, 4, 4, 0]} maxBarSize={16} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </>
      )}

      {/* Per-event breakdown */}
      {eventMetrics && eventMetrics.length > 0 && (
        <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="px-6 py-4 border-b bg-muted/40">
            <h3 className="text-sm font-semibold">Detalhamento por Evento</h3>
          </div>
          <div className="divide-y divide-border">
            {eventMetrics.map(({ event, tickets, payments }) => {
              const revenue = payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
              const sold = tickets.length;
              const capacity = event.maxTickets || 1;
              const pct = Math.min(100, Math.round((sold / capacity) * 100));

              return (
                <div key={event.id} className="px-6 py-4 hover:bg-muted/20">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-semibold text-sm truncate">{event.title}</div>
                      <div className="text-xs text-muted-foreground">
                        {new Date(event.date).toLocaleDateString("pt-BR")} · {event.location}
                      </div>
                      <TypeBreakdown tickets={tickets} />
                    </div>

                    <div className="flex items-center gap-6 shrink-0 text-right">
                      <div>
                        <div className="text-xs text-muted-foreground">Receita</div>
                        <div className="font-bold text-sm text-primary">
                          {formatBRL(revenue)}
                        </div>
                      </div>

                      <div className="w-32">
                        <div className="flex justify-between text-[11px] text-muted-foreground font-medium mb-1">
                          <span>Vendas</span>
                          <span className="font-bold text-foreground">
                            {sold}/{capacity}
                          </span>
                        </div>
                        <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                          <div
                            className={`h-full ${pct === 100 ? "bg-red-500" : "bg-primary"}`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                        <div className="mt-1">
                          <CheckinProgress tickets={tickets} />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
