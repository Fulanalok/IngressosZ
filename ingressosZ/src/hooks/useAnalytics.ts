import { useState, useEffect } from 'react';
import { eventService, paymentService } from '../services/firestore';
import type { Event, PaymentSession } from '../types';
import { toast } from 'sonner';

interface AnalyticsData {
  totalRevenue: number;
  totalTicketsSold: number;
  totalEvents: number;
  averageTicketPrice: number;
  salesByEvent: Record<string, { revenue: number; tickets: number; title: string }>;
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
        console.error('Error fetching analytics data:', err);
        setError('Failed to load analytics data.');
        toast.error('Could not load analytics.');
      } finally {
        setLoading(false);
      }
    }

    fetchData();
  }, []);

  return { data, loading, error };
}

function processAnalytics(events: Event[], payments: PaymentSession[]): AnalyticsData {
  const totalRevenue = payments.reduce((sum, p) => sum + p.totalAmount, 0);
  const totalTicketsSold = payments.reduce((sum, p) => sum + p.quantity, 0);

  const salesByEvent: AnalyticsData['salesByEvent'] = {};

  for (const p of payments) {
    if (!salesByEvent[p.eventId]) {
      const event = events.find(e => e.id === p.eventId);
      salesByEvent[p.eventId] = { revenue: 0, tickets: 0, title: event?.title || 'Evento Desconhecido' };
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

  const dailySales: AnalyticsData['dailySales'] = {};
  for (const p of payments) {
    const date = new Date(p.createdAt.seconds * 1000).toISOString().split('T')[0];
    if (!dailySales[date]) {
      dailySales[date] = { date, revenue: 0, tickets: 0 };
    }
    dailySales[date].revenue += p.totalAmount;
    dailySales[date].tickets += p.quantity;
  }

  return {
    totalRevenue,
    totalTicketsSold,
    totalEvents: events.length,
    averageTicketPrice: totalTicketsSold > 0 ? totalRevenue / totalTicketsSold : 0,
    salesByEvent,
    topEventsByRevenue,
    topEventsByTickets,
    dailySales: Object.values(dailySales).sort((a,b) => new Date(a.date) - new Date(b.date)),
  };
}
