import { useEffect, useState } from "react";
import { toast } from "sonner";
import { eventService, paymentService } from "../services/firestore";
import type { Event, PaymentSession } from "../types";

interface AnalyticsData {
  totalRevenue: number;
  totalTicketsSold: number;
  totalEvents: number;
  averageTicketPrice: number;
  salesByEvent: Record<
    string,
    { revenue: number; tickets: number; title: string }
  >;
  topEventsByRevenue: { id: string; title: string; revenue: number }[];
  topEventsByTickets: { id: string; title: string; tickets: number }[];
  dailySales: { date: string; revenue: number; tickets: number }[];
}

export function useAnalytics() {
  const [data, setData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        setLoading(true);
        const [events, payments] = await Promise.all([
          eventService.getAdminEvents(),
          paymentService.getAllPayments(),
        ]);

        const analytics = processAnalytics(events, payments);
        setData(analytics);
      } catch (err) {
        console.error("Error fetching analytics data:", err);
        setError("Failed to load analytics data.");
        toast.error("Could not load analytics.");
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}

function processAnalytics(
  events: Event[],
  payments: PaymentSession[]
): AnalyticsData {
  const totalRevenue = payments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalTicketsSold = payments.reduce((sum, p) => sum + p.quantity, 0);

  const salesByEvent: AnalyticsData["salesByEvent"] = {};

  for (const p of payments) {
    if (!salesByEvent[p.eventId]) {
      const event = events.find((e) => e.id === p.eventId);
      salesByEvent[p.eventId] = {
        revenue: 0,
        tickets: 0,
        title: event?.title || "Evento Desconhecido",
      };
    }
    salesByEvent[p.eventId].revenue += p.totalAmount;
    salesByEvent[p.eventId].tickets += p.quantity;
  }

  const topEventsByRevenue = Object.entries(salesByEvent)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  const topEventsByTickets = Object.entries(salesByEvent)
    .map(([id, data]) => ({ id, ...data }))
    .sort((a, b) => b.tickets - a.tickets)
    .slice(0, 5);

  const dailySalesMap: Record<
    string,
    { date: string; revenue: number; tickets: number }
  > = {};
  for (const p of payments) {
    let dateStr = "";
    if (typeof p.createdAt === "string") {
      dateStr = p.createdAt.split("T")[0];
    } else if (
      p.createdAt &&
      typeof p.createdAt === "object" &&
      "seconds" in p.createdAt
    ) {
      dateStr = new Date(p.createdAt.seconds * 1000)
        .toISOString()
        .split("T")[0];
    } else {
      continue; // Skip invalid dates
    }

    if (!dailySalesMap[dateStr]) {
      dailySalesMap[dateStr] = { date: dateStr, revenue: 0, tickets: 0 };
    }
    dailySalesMap[dateStr].revenue += p.totalAmount;
    dailySalesMap[dateStr].tickets += p.quantity;
  }

  return {
    totalRevenue,
    totalTicketsSold,
    totalEvents: events.length,
    averageTicketPrice:
      totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0,
    salesByEvent,
    topEventsByRevenue,
    topEventsByTickets,
    dailySales: Object.values(dailySalesMap).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
    ),
  };
}
