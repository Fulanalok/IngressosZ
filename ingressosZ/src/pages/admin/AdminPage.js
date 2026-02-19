import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import SetAdminRole from "../../components/admin/SetAdminRole"; // Importe o novo componente
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import { eventService } from "../../services/firestore";
import { EventForm } from "./EventForm";
export default function AdminPage() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null);
    const { userProfile } = useAuth();
    const loadEvents = async () => {
        setLoading(true);
        try {
            const data = await eventService.getAdminEvents();
            setEvents(data);
        }
        catch (error) {
            console.error("Erro ao carregar eventos", error);
        }
        finally {
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
    const handleEdit = (event) => {
        setCurrentEvent(event);
        setIsEditing(true);
    };
    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza que deseja excluir este evento?"))
            return;
        try {
            await eventService.deleteEvent(id);
            await loadEvents();
            toast.success("Evento excluído com sucesso");
        }
        catch (error) {
            console.error("Erro ao excluir", error);
            toast.error("Erro ao excluir evento");
        }
    };
    const handleSave = async (data) => {
        try {
            if (currentEvent) {
                await eventService.updateEvent(currentEvent.id, data);
            }
            else {
                await eventService.createEvent({
                    ...data,
                    organizerId: userProfile?.uid || "admin",
                });
            }
            setIsEditing(false);
            setCurrentEvent(null);
            await loadEvents();
        }
        catch (error) {
            console.error("Erro ao salvar", error);
            throw error;
        }
    };
    if (loading && !events.length) {
        return (_jsx("div", { className: "min-h-screen pt-20 flex justify-center items-center", children: _jsx("p", { children: "Carregando painel..." }) }));
    }
    return (_jsx("div", { className: "min-h-screen bg-background pt-20 pb-12 px-4", children: _jsxs("div", { className: "max-w-6xl mx-auto", children: [_jsxs("div", { className: "flex justify-between items-center mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-3xl font-bold", children: "Painel Administrativo" }), _jsx("p", { className: "text-muted-foreground", children: "Gerencie seus eventos e vendas" })] }), !isEditing && (_jsx(Button, { onClick: handleCreate, className: "bg-primary text-primary-foreground", children: "+ Novo Evento" }))] }), _jsx("div", { className: "mb-8", children: _jsx(SetAdminRole, {}) }), isEditing ? (_jsxs("div", { className: "bg-card border rounded-xl p-6 shadow-sm", children: [_jsx("h2", { className: "text-xl font-semibold mb-4", children: currentEvent ? "Editar Evento" : "Criar Novo Evento" }), _jsx(EventForm, { initialData: currentEvent, onSave: handleSave, onCancel: () => setIsEditing(false) })] })) : (_jsx("div", { className: "grid gap-4", children: _jsx("div", { className: "bg-card border rounded-xl overflow-hidden shadow-sm", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { className: "bg-muted/50 text-muted-foreground font-medium border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "p-4", children: "Evento" }), _jsx("th", { className: "p-4", children: "Data" }), _jsx("th", { className: "p-4", children: "Local" }), _jsx("th", { className: "p-4", children: "Pre\u00E7o" }), _jsx("th", { className: "p-4", children: "Estoque" }), _jsx("th", { className: "p-4 text-right", children: "A\u00E7\u00F5es" })] }) }), _jsxs("tbody", { className: "divide-y divide-border", children: [events.map((event) => (_jsxs("tr", { className: "hover:bg-muted/50 transition-colors", children: [_jsx("td", { className: "p-4 font-medium", children: event.title }), _jsx("td", { className: "p-4", children: new Date(event.date).toLocaleDateString("pt-BR") }), _jsx("td", { className: "p-4", children: event.location }), _jsxs("td", { className: "p-4", children: ["R$ ", event.price.toFixed(2)] }), _jsx("td", { className: "p-4", children: _jsxs("span", { className: `px-2 py-1 rounded text-xs ${event.availableTickets > 10
                                                                ? "bg-green-500/10 text-green-500"
                                                                : "bg-red-500/10 text-red-500"}`, children: [event.availableTickets, " / ", event.maxTickets] }) }), _jsxs("td", { className: "p-4 text-right space-x-2", children: [_jsx(Button, { variant: "ghost", size: "sm", onClick: () => handleEdit(event), children: "Editar" }), _jsx(Button, { variant: "destructive", size: "sm", onClick: () => handleDelete(event.id), children: "Excluir" })] })] }, event.id))), events.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "p-8 text-center text-muted-foreground", children: "Nenhum evento encontrado. Crie o primeiro!" }) }))] })] }) }) }) }))] }) }));
}
