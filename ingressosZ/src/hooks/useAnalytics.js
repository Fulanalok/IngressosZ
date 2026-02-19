import { useQuery } from "@tanstack/react-query";
import { paymentService } from "../services/firestore";
// Função para processar os dados de pagamento
function processData(payments) {
    if (!payments || payments.length === 0) {
        return [];
    }
    // Agrupa e soma os dados por dia
    const dailyData = payments.reduce((acc, payment) => {
        if (payment.status !== "approved" || !payment.createdAt) {
            return acc;
        }
        const date = new Date(payment.createdAt.seconds * 1000).toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
        if (!acc[date]) {
            acc[date] = { revenue: 0, tickets: 0 };
        }
        acc[date].revenue += payment.totalAmount;
        acc[date].tickets += payment.quantity;
        return acc;
    }, {});
    // Converte para o formato de array esperado pelo gráfico
    const chartData = Object.entries(dailyData).map(([date, data]) => ({
        date,
        revenue: data.revenue,
        tickets: data.tickets,
    }));
    // Ordena os dados por data
    return chartData.sort((a, b) => new Date(a.date.split("/").reverse().join("-")).getTime() - new Date(b.date.split("/").reverse().join("-")).getTime());
}
export function useAnalytics() {
    const { data: payments, isLoading, error } = useQuery({
        queryKey: ["allPayments"],
        queryFn: paymentService.getAllPayments,
    });
    const dailyChartData = processData(payments || []);
    const totalRevenue = dailyChartData.reduce((sum, item) => sum + item.revenue, 0);
    const totalTicketsSold = dailyChartData.reduce((sum, item) => sum + item.tickets, 0);
    // Calcula a variação percentual (exemplo simples)
    const calculateTrend = (data) => {
        if (data.length < 2)
            return 0;
        const last = data[data.length - 1].revenue;
        const secondLast = data[data.length - 2].revenue;
        if (secondLast === 0)
            return last > 0 ? 100 : 0;
        return ((last - secondLast) / secondLast) * 100;
    };
    const revenueTrend = calculateTrend(dailyChartData);
    return {
        isLoading,
        error,
        dailyChartData,
        totalRevenue,
        totalTicketsSold,
        revenueTrend,
        hasData: !!payments && payments.length > 0,
    };
}
