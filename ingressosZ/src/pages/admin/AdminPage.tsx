import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Users as UsersIcon, Plus, Calendar, Settings } from "lucide-react";
import SetAdminRole from "../../components/admin/SetAdminRole";
import AdminDashboard from "../../components/admin/AdminDashboard";
import AttendeeList from "../../components/admin/AttendeeList";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import { eventService, paymentService, ticketService } from "../../services/firestore";
import type { Event } from "../../types";
import { EventForm } from "./EventForm";

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<{ id: string; title: string } | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "settings">("events");
  
  // Dashboard stats
  const [stats, setStats] = useState({
    totalRevenue: 0,
    totalTickets: 0,
    totalEvents: 0
  });

  const { userProfile } = useAuth();

  const loadData = async () => {
    setLoading(true);
    try {
      const [eventsData, paymentsData, ticketsData] = await Promise.all([
        eventService.getAdminEvents(),
        paymentService.getAllPayments(),
        ticketService.getAllTickets()
      ]);

      setEvents(eventsData);
      
      const revenue = paymentsData.reduce((acc, p) => acc + (p.totalAmount || 0), 0);
      setStats({
        totalRevenue: revenue,
        totalTickets: ticketsData.length,
        totalEvents: eventsData.length
      });
    } catch (error) {
      console.error("Erro ao carregar dados", error);
      toast.error("Erro ao carregar dados do painel");
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
      toast.success(currentEvent ? "Evento atualizado" : "Evento criado");
    } catch (error) {
      console.error("Erro ao salvar", error);
      throw error;
    }
  };

  if (loading && !events.length) {
    return (
      <div className="min-h-screen pt-20 flex justify-center items-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pt-20 pb-12 px-4 md:px-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight">Painel do Organizador</h1>
            <p className="text-muted-foreground mt-1">
              Gerencie seus eventos, acompanhe vendas e analise métricas.
            </p>
          </div>
          {!isEditing && (
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 px-6"
            >
              <Plus className="h-5 w-5" />
              Novo Evento
            </Button>
          )}
        </div>

        {/* Dashboard Metrics */}
        {!isEditing && (
          <AdminDashboard 
            totalRevenue={stats.totalRevenue}
            totalTickets={stats.totalTickets}
            totalEvents={stats.totalEvents}
          />
        )}

        {/* Tabs and Content */}
        {!isEditing && (
          <div className="flex border-b mb-6 gap-8">
            <button
              onClick={() => setActiveTab("events")}
              className={`pb-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === "events" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Calendar className="h-4 w-4" />
              Meus Eventos
            </button>
            <button
              onClick={() => setActiveTab("settings")}
              className={`pb-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${
                activeTab === "settings" 
                  ? "border-primary text-primary" 
                  : "border-transparent text-muted-foreground hover:text-foreground"
              }`}
            >
              <Settings className="h-4 w-4" />
              Configurações
            </button>
          </div>
        )}

        {isEditing ? (
          <div className="bg-card border rounded-2xl p-8 shadow-xl max-w-3xl mx-auto">
            <h2 className="text-2xl font-bold mb-6">
              {currentEvent ? "Editar Evento" : "Criar Novo Evento"}
            </h2>
            <EventForm
              initialData={currentEvent}
              onSave={handleSave}
              onCancel={() => setIsEditing(false)}
            />
          </div>
        ) : activeTab === "events" ? (
          <div className="bg-card border rounded-2xl overflow-hidden shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-muted/50 text-muted-foreground font-semibold border-b">
                  <tr>
                    <th className="p-5">Evento</th>
                    <th className="p-5">Data</th>
                    <th className="p-5">Local</th>
                    <th className="p-5">Preço</th>
                    <th className="p-5">Vendas</th>
                    <th className="p-5 text-right">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {events.map((event) => (
                    <tr
                      key={event.id}
                      className="hover:bg-muted/30 transition-colors group"
                    >
                      <td className="p-5">
                        <div className="font-bold text-foreground">{event.title}</div>
                        <div className="text-xs text-muted-foreground">{event.category}</div>
                      </td>
                      <td className="p-5">
                        {new Date(event.date).toLocaleDateString("pt-BR")}
                      </td>
                      <td className="p-5 text-muted-foreground">{event.location}</td>
                      <td className="p-5 font-semibold">R$ {event.price.toFixed(2)}</td>
                      <td className="p-5">
                        <div className="flex flex-col gap-1 w-32">
                          <div className="flex justify-between text-[10px] font-bold uppercase">
                            <span>Vendido</span>
                            <span>{Math.round(((event.maxTickets - event.availableTickets) / event.maxTickets) * 100)}%</span>
                          </div>
                          <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                            <div 
                              className={`h-full ${event.availableTickets === 0 ? "bg-red-500" : "bg-primary"}`}
                              style={{ width: `${Math.min(100, Math.round(((event.maxTickets - event.availableTickets) / event.maxTickets) * 100))}%` }}
                            />
                          </div>
                          <span className="text-[11px] text-muted-foreground">
                            {event.maxTickets - event.availableTickets} / {event.maxTickets}
                          </span>
                        </div>
                      </td>
                      <td className="p-5 text-right flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                        <Button
                          variant="outline"
                          size="sm"
                          className="h-8 text-xs font-bold"
                          onClick={() => setSelectedEventForAttendees({ id: event.id, title: event.title })}
                        >
                          <UsersIcon className="h-3 w-3 mr-1" />
                          Participantes
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 text-xs"
                          onClick={() => handleEdit(event)}
                        >
                          Editar
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          className="h-8 text-xs"
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
                        className="p-12 text-center text-muted-foreground"
                      >
                        <div className="flex flex-col items-center">
                          <Calendar className="h-12 w-12 mb-2 opacity-20" />
                          <p>Nenhum evento encontrado. Crie o primeiro!</p>
                        </div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="bg-card border rounded-2xl p-6 shadow-sm">
              <h2 className="text-xl font-bold mb-4">Gerenciamento de Administradores</h2>
              <p className="text-sm text-muted-foreground mb-6">
                Promova outros usuários para o cargo de administrador ou validador.
              </p>
              <SetAdminRole />
            </div>
          </div>
        )}

        {/* Modal de Participantes */}
        {selectedEventForAttendees && (
          <AttendeeList
            eventId={selectedEventForAttendees.id}
            eventName={selectedEventForAttendees.title}
            onClose={() => setSelectedEventForAttendees(null)}
          />
        )}
      </div>
    </div>
  );
}
