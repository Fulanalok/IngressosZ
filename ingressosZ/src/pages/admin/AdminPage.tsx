import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Users as UsersIcon, Plus, Calendar, Settings, X } from "lucide-react";
import SetAdminRole from "../../components/admin/SetAdminRole";
import AdminDashboard, { type EventMetric } from "../../components/admin/AdminDashboard";
import AttendeeList from "../../components/admin/AttendeeList";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import { adminRealtimeService, eventService, paymentService } from "../../services/firestore";
import type { Event, PaymentSession, Ticket } from "../../types";
import { EventForm } from "./EventForm";

// ─── Event Form Modal ──────────────────────────────────────────────────────────

interface EventFormModalProps {
  currentEvent: Event | null;
  onSave: (data: Omit<Event, "id" | "createdAt" | "updatedAt">) => Promise<void>;
  onClose: () => void;
}

function EventFormModal({ currentEvent, onSave, onClose }: EventFormModalProps) {
  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-end"
      role="dialog"
      aria-modal="true"
    >
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Drawer panel */}
      <div className="relative z-10 h-full w-full max-w-xl bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b shrink-0">
          <div>
            <h2 className="text-xl font-bold">
              {currentEvent ? "Editar Evento" : "Novo Evento"}
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              {currentEvent
                ? "Altere as informações do evento abaixo."
                : "Preencha os dados para publicar um novo evento."}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <div className="flex-1 overflow-y-auto px-6 py-5">
          <EventForm
            initialData={currentEvent}
            onSave={onSave}
            onCancel={onClose}
          />
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [payments, setPayments] = useState<PaymentSession[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [selectedEventForAttendees, setSelectedEventForAttendees] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [activeTab, setActiveTab] = useState<"events" | "settings">("events");
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const unsubscribesRef = useRef<(() => void)[]>([]);
  const { userProfile } = useAuth();

  // Derived stats from live data
  const stats = {
    totalRevenue: payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
    totalTickets: tickets.length,
    totalEvents: events.length,
  };

  const eventMetrics: EventMetric[] = events.map((event) => ({
    event,
    tickets: tickets.filter((t) => t.eventId === event.id),
    payments: payments.filter((p) => p.eventId === event.id),
  }));

  useEffect(() => {
    setLoading(true);
    let eventsReady = false;
    let ticketsReady = false;
    let paymentsReady = false;

    const checkReady = () => {
      if (eventsReady && ticketsReady && paymentsReady) {
        setLoading(false);
        setLastUpdated(new Date());
      }
    };

    const unsubEvents = adminRealtimeService.subscribeToAdminEvents(
      (data) => {
        setEvents(data);
        eventsReady = true;
        setLastUpdated(new Date());
        checkReady();
      },
      () => toast.error("Erro ao escutar eventos")
    );

    const unsubTickets = adminRealtimeService.subscribeToAllTickets(
      (data) => {
        setTickets(data);
        ticketsReady = true;
        setLastUpdated(new Date());
        checkReady();
      },
      () => toast.error("Erro ao escutar ingressos")
    );

    const unsubPayments = paymentService.subscribeToAllPayments(
      (data) => {
        setPayments(data);
        paymentsReady = true;
        setLastUpdated(new Date());
        checkReady();
      },
      () => toast.error("Erro ao escutar pagamentos")
    );

    unsubscribesRef.current = [unsubEvents, unsubTickets, unsubPayments];
    return () => unsubscribesRef.current.forEach((u) => u());
  }, []);

  const handleCreate = () => {
    setCurrentEvent(null);
    setIsEditing(true);
  };

  const handleEdit = (event: Event) => {
    setCurrentEvent(event);
    setIsEditing(true);
  };

  const handleCloseModal = () => {
    setIsEditing(false);
    setCurrentEvent(null);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Tem certeza que deseja excluir este evento?")) return;
    try {
      await eventService.deleteEvent(id);
      toast.success("Evento excluído com sucesso");
    } catch (error) {
      console.error("Erro ao excluir", error);
      toast.error("Erro ao excluir evento");
    }
  };

  const handleSave = async (data: Omit<Event, "id" | "createdAt" | "updatedAt">) => {
    try {
      if (currentEvent) {
        await eventService.updateEvent(currentEvent.id, data);
      } else {
        await eventService.createEvent({
          ...data,
          organizerId: userProfile?.uid || "admin",
        });
      }
      handleCloseModal();
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
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" />
          <p>Carregando painel...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-background pt-20 pb-12 px-4 md:px-8">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-4xl font-extrabold tracking-tight">Painel do Organizador</h1>
              <div className="flex items-center gap-3 mt-1">
                <p className="text-muted-foreground">
                  Gerencie seus eventos, acompanhe vendas e analise métricas.
                </p>
                <div className="flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium shrink-0">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500" />
                  </span>
                  Ao vivo
                  {lastUpdated && (
                    <span className="text-muted-foreground font-normal">
                      ·{" "}
                      {lastUpdated.toLocaleTimeString("pt-BR", {
                        hour: "2-digit",
                        minute: "2-digit",
                        second: "2-digit",
                      })}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <Button
              onClick={handleCreate}
              className="bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 px-6"
            >
              <Plus className="h-5 w-5" />
              Novo Evento
            </Button>
          </div>

          {/* Dashboard Metrics — always visible */}
          <AdminDashboard
            totalRevenue={stats.totalRevenue}
            totalTickets={stats.totalTickets}
            totalEvents={stats.totalEvents}
            eventMetrics={eventMetrics}
          />

          {/* Tabs */}
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

          {/* Tab content */}
          {activeTab === "events" ? (
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
                              <span>
                                {Math.round(
                                  ((event.maxTickets - event.availableTickets) /
                                    event.maxTickets) *
                                    100
                                )}
                                %
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                              <div
                                className={`h-full ${
                                  event.availableTickets === 0 ? "bg-red-500" : "bg-primary"
                                }`}
                                style={{
                                  width: `${Math.min(
                                    100,
                                    Math.round(
                                      ((event.maxTickets - event.availableTickets) /
                                        event.maxTickets) *
                                        100
                                    )
                                  )}%`,
                                }}
                              />
                            </div>
                            <span className="text-[11px] text-muted-foreground">
                              {event.maxTickets - event.availableTickets} / {event.maxTickets}
                            </span>
                          </div>
                        </td>
                        <td className="p-5 text-right">
                          <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-8 text-xs font-bold"
                              onClick={() =>
                                setSelectedEventForAttendees({
                                  id: event.id,
                                  title: event.title,
                                })
                              }
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
                          </div>
                        </td>
                      </tr>
                    ))}
                    {events.length === 0 && (
                      <tr>
                        <td colSpan={6} className="p-12 text-center text-muted-foreground">
                          <div className="flex flex-col items-center">
                            <Calendar className="h-12 w-12 mb-2 opacity-20" />
                            <p className="mb-4">Nenhum evento encontrado.</p>
                            <Button onClick={handleCreate} size="sm">
                              <Plus className="h-4 w-4 mr-1" />
                              Criar primeiro evento
                            </Button>
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
        </div>
      </div>

      {/* Event Form Drawer Modal */}
      {isEditing && (
        <EventFormModal
          currentEvent={currentEvent}
          onSave={handleSave}
          onClose={handleCloseModal}
        />
      )}

      {/* Attendee List Modal */}
      {selectedEventForAttendees && (
        <AttendeeList
          eventId={selectedEventForAttendees.id}
          eventName={selectedEventForAttendees.title}
          onClose={() => setSelectedEventForAttendees(null)}
        />
      )}
    </>
  );
}
