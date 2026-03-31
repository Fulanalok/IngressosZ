import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useMemo } from "react";
import { DollarSign, Users, Calendar, CheckCircle, TrendingUp } from "lucide-react";
import { AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, } from "recharts";
// ─── helpers ──────────────────────────────────────────────────────────────────
function formatBRL(value) {
    return `R$ ${value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;
}
function formatBRLShort(value) {
    if (value >= 1000)
        return `R$ ${(value / 1000).toFixed(1)}k`;
    return `R$ ${value.toFixed(0)}`;
}
const TICKET_COLORS = {
    standard: "#94a3b8",
    vip: "#fbbf24",
    premium: "#a855f7",
};
// ─── sub-components ────────────────────────────────────────────────────────────
function CheckinProgress({ tickets }) {
    const total = tickets.length;
    const used = tickets.filter((t) => t.status === "used").length;
    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
    return (_jsxs("div", { className: "flex flex-col gap-1", children: [_jsxs("div", { className: "flex justify-between text-[11px] text-muted-foreground font-medium", children: [_jsx("span", { children: "Check-in" }), _jsxs("span", { className: "font-bold text-foreground", children: [used, "/", total] })] }), _jsx("div", { className: "h-1.5 w-full bg-muted rounded-full overflow-hidden", children: _jsx("div", { className: "h-full bg-blue-500 transition-all", style: { width: `${pct}%` } }) }), _jsxs("span", { className: "text-[10px] text-muted-foreground", children: [pct, "% validado"] })] }));
}
function TypeBreakdown({ tickets }) {
    const types = ["standard", "vip", "premium"];
    const counts = types
        .map((t) => ({
        type: t,
        count: tickets.filter((tk) => tk.ticketType === t).length,
        revenue: tickets
            .filter((tk) => tk.ticketType === t)
            .reduce((acc, tk) => acc + (tk.price || 0), 0),
    }))
        .filter((t) => t.count > 0);
    if (counts.length === 0)
        return null;
    return (_jsx("div", { className: "flex flex-wrap gap-x-3 gap-y-1 mt-1", children: counts.map(({ type, count, revenue }) => (_jsxs("div", { className: "flex items-center gap-1 text-[11px]", children: [_jsx("div", { className: "w-2 h-2 rounded-full", style: { background: TICKET_COLORS[type] } }), _jsx("span", { className: "capitalize text-muted-foreground", children: type }), _jsx("span", { className: "font-semibold", children: count }), _jsxs("span", { className: "text-muted-foreground", children: ["\u00B7 R$ ", revenue.toLocaleString("pt-BR", { minimumFractionDigits: 0 })] })] }, type))) }));
}
// Custom tooltip for area/bar charts
function RevenueTooltip({ active, payload, label, }) {
    if (!active || !payload?.length)
        return null;
    return (_jsxs("div", { className: "bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm", children: [_jsx("p", { className: "font-semibold mb-0.5", children: label }), _jsx("p", { className: "text-green-500 font-bold", children: formatBRL(payload[0].value) })] }));
}
function TicketsTooltip({ active, payload, label, }) {
    if (!active || !payload?.length)
        return null;
    return (_jsxs("div", { className: "bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm", children: [_jsx("p", { className: "font-semibold mb-0.5", children: label }), _jsxs("p", { className: "text-blue-500 font-bold", children: [payload[0].value, " ingressos"] })] }));
}
function PieTooltip({ active, payload, }) {
    if (!active || !payload?.length)
        return null;
    return (_jsxs("div", { className: "bg-popover border border-border rounded-lg px-3 py-2 shadow-lg text-sm", children: [_jsx("p", { className: "capitalize font-semibold", children: payload[0].name }), _jsxs("p", { className: "text-foreground", children: [payload[0].value, " ingressos"] }), _jsxs("p", { className: "text-muted-foreground", children: [payload[0].payload.pct, "%"] })] }));
}
// ─── main component ────────────────────────────────────────────────────────────
export default function AdminDashboard({ totalRevenue, totalTickets, totalEvents, eventMetrics, }) {
    const allPayments = useMemo(() => eventMetrics?.flatMap((m) => m.payments) ?? [], [eventMetrics]);
    const allTickets = useMemo(() => eventMetrics?.flatMap((m) => m.tickets) ?? [], [eventMetrics]);
    const totalCheckins = allTickets.filter((t) => t.status === "used").length;
    // Revenue over last 30 days grouped by day
    const revenueByDay = useMemo(() => {
        const days = {};
        const now = Date.now();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            days[key] = 0;
        }
        allPayments.forEach((p) => {
            const ts = p.createdAt?.toDate?.();
            if (!ts)
                return;
            const key = ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            if (key in days)
                days[key] += p.totalAmount || 0;
        });
        return Object.entries(days).map(([date, revenue]) => ({ date, revenue }));
    }, [allPayments]);
    // Tickets sold per day (last 30)
    const ticketsByDay = useMemo(() => {
        const days = {};
        const now = Date.now();
        for (let i = 29; i >= 0; i--) {
            const d = new Date(now - i * 86400000);
            const key = d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            days[key] = 0;
        }
        allTickets.forEach((t) => {
            const ts = t.purchaseDate?.toDate?.();
            if (!ts)
                return;
            const key = ts.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" });
            if (key in days)
                days[key] += 1;
        });
        return Object.entries(days).map(([date, tickets]) => ({ date, tickets }));
    }, [allTickets]);
    // Revenue per event (bar chart)
    const revenueByEvent = useMemo(() => {
        return (eventMetrics
            ?.map(({ event, payments }) => ({
            name: event.title.length > 18 ? event.title.slice(0, 18) + "…" : event.title,
            revenue: payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        }))
            .filter((e) => e.revenue > 0)
            .sort((a, b) => b.revenue - a.revenue)
            .slice(0, 8) ?? []);
    }, [eventMetrics]);
    // Ticket type distribution (pie)
    const typeDistribution = useMemo(() => {
        const counts = { standard: 0, vip: 0, premium: 0 };
        allTickets.forEach((t) => {
            if (t.ticketType in counts)
                counts[t.ticketType]++;
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
            color: "text-green-500",
            bg: "bg-green-500/10",
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
            color: "text-purple-500",
            bg: "bg-purple-500/10",
        },
        {
            title: "Check-ins Realizados",
            value: totalCheckins.toString(),
            icon: CheckCircle,
            color: "text-orange-500",
            bg: "bg-orange-500/10",
        },
    ];
    const hasChartData = revenueByDay.some((d) => d.revenue > 0) ||
        ticketsByDay.some((d) => d.tickets > 0);
    return (_jsxs("div", { className: "mb-8 space-y-6", children: [_jsx("div", { className: "grid grid-cols-2 md:grid-cols-4 gap-4", children: summaryCards.map((card) => (_jsxs("div", { className: "bg-card border rounded-xl p-5 shadow-sm flex items-center gap-4", children: [_jsx("div", { className: `${card.bg} p-3 rounded-full shrink-0`, children: _jsx(card.icon, { className: `h-5 w-5 ${card.color}` }) }), _jsxs("div", { children: [_jsx("p", { className: "text-xs text-muted-foreground", children: card.title }), _jsx("h3", { className: "text-xl font-bold leading-tight", children: card.value })] })] }, card.title))) }), hasChartData && (_jsxs(_Fragment, { children: [_jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-3 gap-4", children: [_jsxs("div", { className: "lg:col-span-2 bg-card border rounded-xl p-5 shadow-sm", children: [_jsxs("div", { className: "flex items-center gap-2 mb-4", children: [_jsx(TrendingUp, { className: "h-4 w-4 text-green-500" }), _jsx("h3", { className: "text-sm font-semibold", children: "Faturamento \u2014 \u00FAltimos 30 dias" })] }), _jsx(ResponsiveContainer, { width: "100%", height: 180, children: _jsxs(AreaChart, { data: revenueByDay, margin: { top: 4, right: 4, bottom: 0, left: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "colorRevenue", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#22c55e", stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: "#22c55e", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(var(--border))", vertical: false }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" }, tickLine: false, axisLine: false, interval: 6 }), _jsx(YAxis, { tickFormatter: formatBRLShort, tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" }, tickLine: false, axisLine: false, width: 60 }), _jsx(Tooltip, { content: _jsx(RevenueTooltip, {}) }), _jsx(Area, { type: "monotone", dataKey: "revenue", stroke: "#22c55e", strokeWidth: 2, fill: "url(#colorRevenue)", dot: false, activeDot: { r: 4, fill: "#22c55e" } })] }) })] }), _jsxs("div", { className: "bg-card border rounded-xl p-5 shadow-sm flex flex-col", children: [_jsx("h3", { className: "text-sm font-semibold mb-4", children: "Distribui\u00E7\u00E3o por Tipo" }), typeDistribution.length > 0 ? (_jsxs(_Fragment, { children: [_jsx(ResponsiveContainer, { width: "100%", height: 140, children: _jsxs(PieChart, { children: [_jsx(Pie, { data: typeDistribution, cx: "50%", cy: "50%", innerRadius: 42, outerRadius: 65, paddingAngle: 3, dataKey: "value", children: typeDistribution.map((entry) => (_jsx(Cell, { fill: entry.color }, entry.name))) }), _jsx(Tooltip, { content: _jsx(PieTooltip, {}) })] }) }), _jsx("div", { className: "flex flex-col gap-1.5 mt-2", children: typeDistribution.map((entry) => (_jsxs("div", { className: "flex items-center justify-between text-xs", children: [_jsxs("div", { className: "flex items-center gap-1.5", children: [_jsx("div", { className: "w-2.5 h-2.5 rounded-full", style: { background: entry.color } }), _jsx("span", { className: "text-muted-foreground", children: entry.name })] }), _jsxs("span", { className: "font-semibold", children: [entry.value, " ", _jsxs("span", { className: "text-muted-foreground font-normal", children: ["(", entry.pct, "%)"] })] })] }, entry.name))) })] })) : (_jsx("div", { className: "flex-1 flex items-center justify-center text-sm text-muted-foreground", children: "Sem dados de ingressos" }))] })] }), _jsxs("div", { className: "grid grid-cols-1 lg:grid-cols-2 gap-4", children: [_jsxs("div", { className: "bg-card border rounded-xl p-5 shadow-sm", children: [_jsx("h3", { className: "text-sm font-semibold mb-4", children: "Ingressos vendidos \u2014 \u00FAltimos 30 dias" }), _jsx(ResponsiveContainer, { width: "100%", height: 160, children: _jsxs(AreaChart, { data: ticketsByDay, margin: { top: 4, right: 4, bottom: 0, left: 0 }, children: [_jsx("defs", { children: _jsxs("linearGradient", { id: "colorTickets", x1: "0", y1: "0", x2: "0", y2: "1", children: [_jsx("stop", { offset: "5%", stopColor: "#3b82f6", stopOpacity: 0.3 }), _jsx("stop", { offset: "95%", stopColor: "#3b82f6", stopOpacity: 0 })] }) }), _jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(var(--border))", vertical: false }), _jsx(XAxis, { dataKey: "date", tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" }, tickLine: false, axisLine: false, interval: 6 }), _jsx(YAxis, { allowDecimals: false, tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" }, tickLine: false, axisLine: false, width: 30 }), _jsx(Tooltip, { content: _jsx(TicketsTooltip, {}) }), _jsx(Area, { type: "monotone", dataKey: "tickets", stroke: "#3b82f6", strokeWidth: 2, fill: "url(#colorTickets)", dot: false, activeDot: { r: 4, fill: "#3b82f6" } })] }) })] }), revenueByEvent.length > 0 && (_jsxs("div", { className: "bg-card border rounded-xl p-5 shadow-sm", children: [_jsx("h3", { className: "text-sm font-semibold mb-4", children: "Faturamento por Evento" }), _jsx(ResponsiveContainer, { width: "100%", height: 160, children: _jsxs(BarChart, { data: revenueByEvent, margin: { top: 4, right: 4, bottom: 0, left: 0 }, layout: "vertical", children: [_jsx(CartesianGrid, { strokeDasharray: "3 3", stroke: "hsl(var(--border))", horizontal: false }), _jsx(XAxis, { type: "number", tickFormatter: formatBRLShort, tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" }, tickLine: false, axisLine: false }), _jsx(YAxis, { type: "category", dataKey: "name", tick: { fontSize: 10, fill: "hsl(var(--muted-foreground))" }, tickLine: false, axisLine: false, width: 90 }), _jsx(Tooltip, { content: _jsx(RevenueTooltip, {}) }), _jsx(Bar, { dataKey: "revenue", fill: "#a855f7", radius: [0, 4, 4, 0], maxBarSize: 16 })] }) })] }))] })] })), eventMetrics && eventMetrics.length > 0 && (_jsxs("div", { className: "bg-card border rounded-xl overflow-hidden shadow-sm", children: [_jsx("div", { className: "px-6 py-4 border-b bg-muted/40", children: _jsx("h3", { className: "text-sm font-semibold", children: "Detalhamento por Evento" }) }), _jsx("div", { className: "divide-y divide-border", children: eventMetrics.map(({ event, tickets, payments }) => {
                            const revenue = payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
                            const sold = tickets.length;
                            const capacity = event.maxTickets || 1;
                            const pct = Math.min(100, Math.round((sold / capacity) * 100));
                            return (_jsx("div", { className: "px-6 py-4 hover:bg-muted/20 transition-colors", children: _jsxs("div", { className: "flex flex-col md:flex-row md:items-center justify-between gap-3", children: [_jsxs("div", { className: "min-w-0 flex-1", children: [_jsx("div", { className: "font-semibold text-sm truncate", children: event.title }), _jsxs("div", { className: "text-xs text-muted-foreground", children: [new Date(event.date).toLocaleDateString("pt-BR"), " \u00B7 ", event.location] }), _jsx(TypeBreakdown, { tickets: tickets })] }), _jsxs("div", { className: "flex items-center gap-6 shrink-0 text-right", children: [_jsxs("div", { children: [_jsx("div", { className: "text-xs text-muted-foreground", children: "Receita" }), _jsx("div", { className: "font-bold text-sm text-green-600 dark:text-green-400", children: formatBRL(revenue) })] }), _jsxs("div", { className: "w-32", children: [_jsxs("div", { className: "flex justify-between text-[11px] text-muted-foreground font-medium mb-1", children: [_jsx("span", { children: "Vendas" }), _jsxs("span", { className: "font-bold text-foreground", children: [sold, "/", capacity] })] }), _jsx("div", { className: "h-1.5 w-full bg-muted rounded-full overflow-hidden", children: _jsx("div", { className: `h-full ${pct === 100 ? "bg-red-500" : "bg-primary"} transition-all`, style: { width: `${pct}%` } }) }), _jsx("div", { className: "mt-1", children: _jsx(CheckinProgress, { tickets: tickets }) })] })] })] }) }, event.id));
                        }) })] }))] }));
}
