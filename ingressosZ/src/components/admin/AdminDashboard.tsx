import { DollarSign, Users, Calendar } from "lucide-react";

interface AdminDashboardProps {
  totalRevenue: number;
  totalTickets: number;
  totalEvents: number;
}

export default function AdminDashboard({
  totalRevenue,
  totalTickets,
  totalEvents,
}: AdminDashboardProps) {
  const cards = [
    {
      title: "Receita Total",
      value: `R$ ${totalRevenue.toLocaleString("pt-BR", {
        minimumFractionDigits: 2,
      })}`,
      icon: DollarSign,
      color: "text-green-500",
      bgColor: "bg-green-500/10",
    },
    {
      title: "Ingressos Vendidos",
      value: totalTickets.toString(),
      icon: Users,
      color: "text-blue-500",
      bgColor: "bg-blue-500/10",
    },
    {
      title: "Eventos Ativos",
      value: totalEvents.toString(),
      icon: Calendar,
      color: "text-purple-500",
      bgColor: "bg-purple-500/10",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      {cards.map((card) => (
        <div
          key={card.title}
          className="bg-card border rounded-xl p-6 shadow-sm flex items-center"
        >
          <div className={`${card.bgColor} p-4 rounded-full mr-4`}>
            <card.icon className={`h-6 w-6 ${card.color}`} />
          </div>
          <div>
            <p className="text-sm text-muted-foreground">{card.title}</p>
            <h3 className="text-2xl font-bold">{card.value}</h3>
          </div>
        </div>
      ))}
    </div>
  );
}
