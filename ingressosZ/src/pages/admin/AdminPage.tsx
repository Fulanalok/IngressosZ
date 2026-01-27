import { useEffect, useState } from "react";
import { Button } from "../../components/ui/button";
import { eventService } from "../../services/firestore";
import type { Event } from "../../types";
import { EventForm } from "./EventForm";
import { useAuth } from "../../hooks/useAuth";
import SetAdminRole from "../../components/admin/SetAdminRole"; // Importe o novo componente

export default function AdminPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const { userProfile } = useAuth();

  const loadEvents = async () => {
    setLoading(true);
    try {
      const data = await eventService.getAdminEvents();
      setEvents(data);
    } catch (error) {
      console.error("Erro ao carregar eventos", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadEvents();
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
    if (!confirm("Tem certeza que deseja excluir este evento?")) return;
    try {
      await eventService.deleteEvent(id);
      await loadEvents();
    } catch (error) {
      console.error("Erro ao excluir", error);
      alert("Erro ao excluir evento");
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
      setIsEditing(false);
      setCurrentEvent(null);
      await loadEvents();
    } catch (error) {
      console.error("Erro ao salvar", error);
      throw error;
    }
  };

  if (loading && !events.length) {
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
            <p className="text-muted-foreground">Gerencie seus eventos e vendas</p>
          </div>
          {!isEditing && (
            <Button onClick={handleCreate} className="bg-primary text-primary-foreground">
              + Novo Evento
            </Button>
          )}
        </div>

        {/* Seção para Tornar Admin */}
        <div className="mb-8">
          <SetAdminRole />
        </div>

        {isEditing ? (
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
                      <tr key={event.id} className="hover:bg-muted/50 transition-colors">
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
                                ? "bg-green-100 text-green-700"
                                : "bg-red-100 text-red-700"
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
                        <td colSpan={6} className="p-8 text-center text-muted-foreground">
                          Nenhum evento encontrado. Crie o primeiro!
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
