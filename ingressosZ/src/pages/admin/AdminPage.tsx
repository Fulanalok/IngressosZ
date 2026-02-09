import { Calendar, CheckCircle, DollarSign, Ticket } from "lucide-react";
import { useEffect, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { toast } from "sonner";
import SetAdminRole from "../../components/admin/SetAdminRole";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import {
  adminService,
  eventService,
  purchaseService,
} from "../../services/firestore";
import type { Event, Purchase } from "../../types";
import { EventForm } from "./EventForm";

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    ticketsSold: 0,
    ticketsUsed: 0,
    salesByDate: [] as { date: string; amount: number; tickets: number }[],
    ticketsByStatus: [] as { name: string; value: number; fill: string }[],
  });
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [activeTab, setActiveTab] = useState<"events" | "orders">("events");
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const { userProfile } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, statsData, purchasesData] = await Promise.all([
        eventService.getAdminEvents(),
        adminService.getDashboardStats(),
        purchaseService.getAllPurchases(),
      ]);
      setEvents(eventsData);
      setStats(statsData);
      setPurchases(purchasesData);
    } catch (error) {
      console.error("Erro ao carregar dados", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = () => {
    setCurrentEvent(null);
    setIsEditing(true);
  };

  const handleEdit = (event: Event) => {
    setCurrentEvent(event);
    setIsEditing(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;
    try {
      await eventService.deleteEvent(id);
      await loadData();
      toast.success("Evento excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir", error);
      toast.error("Erro ao excluir evento");
    }
  };

  const handleSave = async (
    data: Omit<Event, "id" | "createdAt" | "updatedAt">
  ) => {
    try {
      if (currentEvent) {
        await eventService.updateEvent(currentEvent.id, data);
      } else {
        await eventService.createEvent({
          ...data,
          organizerId: userProfile?.uid || "admin",
        });
      }
      setIsEditing(false);
      setCurrentEvent(null);
      await loadData();
    } catch (error) {
      console.error("Erro ao salvar", error);
      throw error;
    }
  };

  const handleRefund = async (paymentId: string) => {
    if (
      !window.confirm(
        "Tem certeza que deseja reembolsar este pedido? Esta ação não pode ser desfeita e cancelará os ingressos."
      )
    )
      return;
    try {
      setLoading(true);
      await purchaseService.refundPurchase(paymentId);
      toast.success("Reembolso processado com sucesso");
      await loadData();
    } catch (error) {
      console.error("Erro ao reembolsar", error);
      toast.error("Erro ao processar reembolso. Verifique o console.");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !events.length && !purchases.length) {
    return (
      <div className="min-h-screen pt-20 flex justify-center items-center">
        <p>Carregando painel...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold">Painel Administrativo</h1>
            <p className="text-muted-foreground">
              Gerencie seus eventos e vendas
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={handleCreate}
              className="bg-primary text-primary-foreground"
            >
              + Novo Evento
            </Button>
          )}
        </div>

        {/* Dashboard Stats */}
        {!isEditing && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
            <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-green-500/10 rounded-full">
                <DollarSign className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Receita Total
                </p>
                <h3 className="text-2xl font-bold">
                  {stats.totalRevenue.toLocaleString("pt-BR", {
                    style: "currency",
                    currency: "BRL",
                  })}
                </h3>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-blue-500/10 rounded-full">
                <Ticket className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Ingressos Vendidos
                </p>
                <h3 className="text-2xl font-bold">{stats.ticketsSold}</h3>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-purple-500/10 rounded-full">
                <Calendar className="w-6 h-6 text-purple-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Eventos Ativos
                </p>
                <h3 className="text-2xl font-bold">{events.length}</h3>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-orange-500/10 rounded-full">
                <CheckCircle className="w-6 h-6 text-orange-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground font-medium">
                  Check-ins Realizados
                </p>
                <h3 className="text-2xl font-bold">{stats.ticketsUsed}</h3>
              </div>
            </div>
          </div>
        )}

        {/* Charts Section */}
        {!isEditing && stats.salesByDate.length > 0 && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
            <div className="bg-card border rounded-xl p-6 shadow-sm col-span-2">
              <h3 className="text-lg font-semibold mb-6">
                Vendas nos últimos dias
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats.salesByDate}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString("pt-BR", {
                          day: "2-digit",
                          month: "2-digit",
                        })
                      }
                      fontSize={12}
                    />
                    <YAxis yAxisId="left" fontSize={12} />
                    <YAxis yAxisId="right" orientation="right" fontSize={12} />
                    <Tooltip
                      formatter={(value: any, name: any) => [
                        name === "Receita"
                          ? `R$ ${value.toLocaleString("pt-BR")}`
                          : value,
                        name,
                      ]}
                      labelFormatter={(label) =>
                        new Date(label).toLocaleDateString("pt-BR")
                      }
                    />
                    <Legend />
                    <Bar
                      yAxisId="left"
                      dataKey="amount"
                      name="Receita"
                      fill="#22c55e"
                      radius={[4, 4, 0, 0]}
                    />
                    <Bar
                      yAxisId="right"
                      dataKey="tickets"
                      name="Ingressos"
                      fill="#3b82f6"
                      radius={[4, 4, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h3 className="text-lg font-semibold mb-6">
                Status dos Ingressos
              </h3>
              <div className="h-[300px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={stats.ticketsByStatus}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={5}
                      dataKey="value"
                    >
                      {stats.ticketsByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Pie>
                    <Tooltip />
                    <Legend />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {/* Seção para Tornar Admin */}
        <div className="mb-8">
          <SetAdminRole />
        </div>

        <div className="flex gap-4 mb-6">
          <Button
            variant={activeTab === "events" ? "default" : "outline"}
            onClick={() => setActiveTab("events")}
          >
            Eventos
          </Button>
          <Button
            variant={activeTab === "orders" ? "default" : "outline"}
            onClick={() => setActiveTab("orders")}
          >
            Pedidos
          </Button>
        </div>

        {activeTab === "events" ? (
          isEditing ? (
            <div className="bg-card border rounded-xl p-6 shadow-sm">
              <h2 className="text-xl font-semibold mb-4">
                {currentEvent ? "Editar Evento" : "Criar Novo Evento"}
              </h2>
              <EventForm
                initialData={currentEvent}
                onSave={handleSave}
                onCancel={() => setIsEditing(false)}
              />
            </div>
          ) : (
            <div className="grid gap-4">
              <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                      <tr>
                        <th className="p-4">Evento</th>
                        <th className="p-4">Data</th>
                        <th className="p-4">Local</th>
                        <th className="p-4">Preço</th>
                        <th className="p-4">Estoque</th>
                        <th className="p-4 text-right">Ações</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border">
                      {events.map((event) => (
                        <tr
                          key={event.id}
                          className="hover:bg-muted/50 transition-colors"
                        >
                          <td className="p-4 font-medium">{event.title}</td>
                          <td className="p-4">
                            {new Date(event.date).toLocaleDateString("pt-BR")}
                          </td>
                          <td className="p-4">{event.location}</td>
                          <td className="p-4">R$ {event.price.toFixed(2)}</td>
                          <td className="p-4">
                            <span
                              className={`px-2 py-1 rounded text-xs ${
                                event.availableTickets > 10
                                  ? "bg-green-500/10 text-green-500"
                                  : "bg-red-500/10 text-red-500"
                              }`}
                            >
                              {event.availableTickets} / {event.maxTickets}
                            </span>
                          </td>
                          <td className="p-4 text-right space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(event)}
                            >
                              Editar
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDelete(event.id)}
                            >
                              Excluir
                            </Button>
                          </td>
                        </tr>
                      ))}
                      {events.length === 0 && (
                        <tr>
                          <td
                            colSpan={6}
                            className="p-8 text-center text-muted-foreground"
                          >
                            Nenhum evento encontrado. Crie o primeiro!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )
        ) : (
          <div className="bg-card border rounded-xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground font-medium border-b">
                  <tr>
                    <th className="p-4">Data</th>
                    <th className="p-4">ID Pagamento</th>
                    <th className="p-4">Status</th>
                    <th className="p-4">Itens</th>
                    <th className="p-4 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {purchases.map((purchase) => (
                    <tr
                      key={purchase.id}
                      className="hover:bg-muted/50 transition-colors"
                    >
                      <td className="p-4">
                        {purchase.createdAt?.seconds
                          ? new Date(
                              purchase.createdAt.seconds * 1000
                            ).toLocaleDateString("pt-BR")
                          : "Data inválida"}
                      </td>
                      <td className="p-4 font-mono text-xs">
                        {purchase.paymentId}
                      </td>
                      <td className="p-4">
                        <span
                          className={`px-2 py-1 rounded text-xs ${
                            purchase.status === "approved"
                              ? "bg-green-500/10 text-green-500"
                              : purchase.status === "refunded"
                              ? "bg-yellow-500/10 text-yellow-500"
                              : "bg-red-500/10 text-red-500"
                          }`}
                        >
                          {purchase.status === "approved"
                            ? "Aprovado"
                            : purchase.status === "refunded"
                            ? "Reembolsado"
                            : "Cancelado"}
                        </span>
                      </td>
                      <td className="p-4">
                        <ul className="list-disc list-inside">
                          {purchase.items?.map((item, idx) => (
                            <li key={idx}>
                              {item.quantity}x {item.title}
                            </li>
                          ))}
                        </ul>
                      </td>
                      <td className="p-4 text-right">
                        {purchase.status === "approved" && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleRefund(purchase.paymentId)}
                          >
                            Reembolsar
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {purchases.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="p-8 text-center text-muted-foreground"
                      >
                        Nenhuma venda encontrada.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
