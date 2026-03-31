import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Users as UsersIcon, Plus, Calendar, Settings, X } from "lucide-react";
import SetAdminRole from "../../components/admin/SetAdminRole";
import AdminDashboard from "../../components/admin/AdminDashboard";
import AttendeeList from "../../components/admin/AttendeeList";
import { Button } from "../../components/ui/button";
import { useAuth } from "../../hooks/useAuth";
import { adminRealtimeService, eventService, paymentService } from "../../services/firestore";
import { EventForm } from "./EventForm";
function EventFormModal({ currentEvent, onSave, onClose }) {
    // Close on Escape key
    useEffect(() => {
        const handler = (e) => {
            if (e.key === "Escape")
                onClose();
        };
        document.addEventListener("keydown", handler);
        return () => document.removeEventListener("keydown", handler);
    }, [onClose]);
    // Prevent body scroll while open
    useEffect(() => {
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = ""; };
    }, []);
    return (_jsxs("div", { className: "fixed inset-0 z-50 flex items-start justify-end", role: "dialog", "aria-modal": "true", children: [_jsx("div", { className: "absolute inset-0 bg-black/50 backdrop-blur-sm", onClick: onClose }), _jsxs("div", { className: "relative z-10 h-full w-full max-w-xl bg-background border-l border-border shadow-2xl flex flex-col animate-in slide-in-from-right duration-300", children: [_jsxs("div", { className: "flex items-center justify-between px-6 py-5 border-b shrink-0", children: [_jsxs("div", { children: [_jsx("h2", { className: "text-xl font-bold", children: currentEvent ? "Editar Evento" : "Novo Evento" }), _jsx("p", { className: "text-xs text-muted-foreground mt-0.5", children: currentEvent
                                            ? "Altere as informações do evento abaixo."
                                            : "Preencha os dados para publicar um novo evento." })] }), _jsx("button", { onClick: onClose, className: "p-1.5 rounded-md hover:bg-muted transition-colors text-muted-foreground hover:text-foreground", "aria-label": "Fechar", children: _jsx(X, { className: "h-5 w-5" }) })] }), _jsx("div", { className: "flex-1 overflow-y-auto px-6 py-5", children: _jsx(EventForm, { initialData: currentEvent, onSave: onSave, onCancel: onClose }) })] })] }));
}
// ─── Main Page ────────────────────────────────────────────────────────────────
export default function AdminPage() {
    const [events, setEvents] = useState([]);
    const [tickets, setTickets] = useState([]);
    const [payments, setPayments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [currentEvent, setCurrentEvent] = useState(null);
    const [selectedEventForAttendees, setSelectedEventForAttendees] = useState(null);
    const [activeTab, setActiveTab] = useState("events");
    const [lastUpdated, setLastUpdated] = useState(null);
    const unsubscribesRef = useRef([]);
    const { userProfile } = useAuth();
    // Derived stats from live data
    const stats = {
        totalRevenue: payments.reduce((acc, p) => acc + (p.totalAmount || 0), 0),
        totalTickets: tickets.length,
        totalEvents: events.length,
    };
    const eventMetrics = events.map((event) => ({
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
        const unsubEvents = adminRealtimeService.subscribeToAdminEvents((data) => {
            setEvents(data);
            eventsReady = true;
            setLastUpdated(new Date());
            checkReady();
        }, () => toast.error("Erro ao escutar eventos"));
        const unsubTickets = adminRealtimeService.subscribeToAllTickets((data) => {
            setTickets(data);
            ticketsReady = true;
            setLastUpdated(new Date());
            checkReady();
        }, () => toast.error("Erro ao escutar ingressos"));
        const unsubPayments = paymentService.subscribeToAllPayments((data) => {
            setPayments(data);
            paymentsReady = true;
            setLastUpdated(new Date());
            checkReady();
        }, () => toast.error("Erro ao escutar pagamentos"));
        unsubscribesRef.current = [unsubEvents, unsubTickets, unsubPayments];
        return () => unsubscribesRef.current.forEach((u) => u());
    }, []);
    const handleCreate = () => {
        setCurrentEvent(null);
        setIsEditing(true);
    };
    const handleEdit = (event) => {
        setCurrentEvent(event);
        setIsEditing(true);
    };
    const handleCloseModal = () => {
        setIsEditing(false);
        setCurrentEvent(null);
    };
    const handleDelete = async (id) => {
        if (!window.confirm("Tem certeza que deseja excluir este evento?"))
            return;
        try {
            await eventService.deleteEvent(id);
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
            handleCloseModal();
            toast.success(currentEvent ? "Evento atualizado" : "Evento criado");
        }
        catch (error) {
            console.error("Erro ao salvar", error);
            throw error;
        }
    };
    if (loading && !events.length) {
        return (_jsx("div", { className: "min-h-screen pt-20 flex justify-center items-center", children: _jsxs("div", { className: "text-center", children: [_jsx("div", { className: "animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4" }), _jsx("p", { children: "Carregando painel..." })] }) }));
    }
    return (_jsxs(_Fragment, { children: [_jsx("div", { className: "min-h-screen bg-background pt-20 pb-12 px-4 md:px-8", children: _jsxs("div", { className: "max-w-7xl mx-auto", children: [_jsxs("div", { className: "flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8", children: [_jsxs("div", { children: [_jsx("h1", { className: "text-4xl font-extrabold tracking-tight", children: "Painel do Organizador" }), _jsxs("div", { className: "flex items-center gap-3 mt-1", children: [_jsx("p", { className: "text-muted-foreground", children: "Gerencie seus eventos, acompanhe vendas e analise m\u00E9tricas." }), _jsxs("div", { className: "flex items-center gap-1.5 text-xs text-green-600 dark:text-green-400 font-medium shrink-0", children: [_jsxs("span", { className: "relative flex h-2 w-2", children: [_jsx("span", { className: "animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75" }), _jsx("span", { className: "relative inline-flex rounded-full h-2 w-2 bg-green-500" })] }), "Ao vivo", lastUpdated && (_jsxs("span", { className: "text-muted-foreground font-normal", children: ["\u00B7", " ", lastUpdated.toLocaleTimeString("pt-BR", {
                                                                    hour: "2-digit",
                                                                    minute: "2-digit",
                                                                    second: "2-digit",
                                                                })] }))] })] })] }), _jsxs(Button, { onClick: handleCreate, className: "bg-primary hover:bg-primary/90 text-primary-foreground flex items-center gap-2 px-6", children: [_jsx(Plus, { className: "h-5 w-5" }), "Novo Evento"] })] }), _jsx(AdminDashboard, { totalRevenue: stats.totalRevenue, totalTickets: stats.totalTickets, totalEvents: stats.totalEvents, eventMetrics: eventMetrics }), _jsxs("div", { className: "flex border-b mb-6 gap-8", children: [_jsxs("button", { onClick: () => setActiveTab("events"), className: `pb-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === "events"
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"}`, children: [_jsx(Calendar, { className: "h-4 w-4" }), "Meus Eventos"] }), _jsxs("button", { onClick: () => setActiveTab("settings"), className: `pb-4 text-sm font-semibold transition-colors flex items-center gap-2 border-b-2 ${activeTab === "settings"
                                        ? "border-primary text-primary"
                                        : "border-transparent text-muted-foreground hover:text-foreground"}`, children: [_jsx(Settings, { className: "h-4 w-4" }), "Configura\u00E7\u00F5es"] })] }), activeTab === "events" ? (_jsx("div", { className: "bg-card border rounded-2xl overflow-hidden shadow-sm", children: _jsx("div", { className: "overflow-x-auto", children: _jsxs("table", { className: "w-full text-left text-sm", children: [_jsx("thead", { className: "bg-muted/50 text-muted-foreground font-semibold border-b", children: _jsxs("tr", { children: [_jsx("th", { className: "p-5", children: "Evento" }), _jsx("th", { className: "p-5", children: "Data" }), _jsx("th", { className: "p-5", children: "Local" }), _jsx("th", { className: "p-5", children: "Pre\u00E7o" }), _jsx("th", { className: "p-5", children: "Vendas" }), _jsx("th", { className: "p-5 text-right", children: "A\u00E7\u00F5es" })] }) }), _jsxs("tbody", { className: "divide-y divide-border", children: [events.map((event) => (_jsxs("tr", { className: "hover:bg-muted/30 transition-colors group", children: [_jsxs("td", { className: "p-5", children: [_jsx("div", { className: "font-bold text-foreground", children: event.title }), _jsx("div", { className: "text-xs text-muted-foreground", children: event.category })] }), _jsx("td", { className: "p-5", children: new Date(event.date).toLocaleDateString("pt-BR") }), _jsx("td", { className: "p-5 text-muted-foreground", children: event.location }), _jsxs("td", { className: "p-5 font-semibold", children: ["R$ ", event.price.toFixed(2)] }), _jsx("td", { className: "p-5", children: _jsxs("div", { className: "flex flex-col gap-1 w-32", children: [_jsxs("div", { className: "flex justify-between text-[10px] font-bold uppercase", children: [_jsx("span", { children: "Vendido" }), _jsxs("span", { children: [Math.round(((event.maxTickets - event.availableTickets) /
                                                                                        event.maxTickets) *
                                                                                        100), "%"] })] }), _jsx("div", { className: "h-1.5 w-full bg-muted rounded-full overflow-hidden", children: _jsx("div", { className: `h-full ${event.availableTickets === 0 ? "bg-red-500" : "bg-primary"}`, style: {
                                                                                width: `${Math.min(100, Math.round(((event.maxTickets - event.availableTickets) /
                                                                                    event.maxTickets) *
                                                                                    100))}%`,
                                                                            } }) }), _jsxs("span", { className: "text-[11px] text-muted-foreground", children: [event.maxTickets - event.availableTickets, " / ", event.maxTickets] })] }) }), _jsx("td", { className: "p-5 text-right", children: _jsxs("div", { className: "flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity", children: [_jsxs(Button, { variant: "outline", size: "sm", className: "h-8 text-xs font-bold", onClick: () => setSelectedEventForAttendees({
                                                                            id: event.id,
                                                                            title: event.title,
                                                                        }), children: [_jsx(UsersIcon, { className: "h-3 w-3 mr-1" }), "Participantes"] }), _jsx(Button, { variant: "ghost", size: "sm", className: "h-8 text-xs", onClick: () => handleEdit(event), children: "Editar" }), _jsx(Button, { variant: "destructive", size: "sm", className: "h-8 text-xs", onClick: () => handleDelete(event.id), children: "Excluir" })] }) })] }, event.id))), events.length === 0 && (_jsx("tr", { children: _jsx("td", { colSpan: 6, className: "p-12 text-center text-muted-foreground", children: _jsxs("div", { className: "flex flex-col items-center", children: [_jsx(Calendar, { className: "h-12 w-12 mb-2 opacity-20" }), _jsx("p", { className: "mb-4", children: "Nenhum evento encontrado." }), _jsxs(Button, { onClick: handleCreate, size: "sm", children: [_jsx(Plus, { className: "h-4 w-4 mr-1" }), "Criar primeiro evento"] })] }) }) }))] })] }) }) })) : (_jsx("div", { className: "space-y-8", children: _jsxs("div", { className: "bg-card border rounded-2xl p-6 shadow-sm", children: [_jsx("h2", { className: "text-xl font-bold mb-4", children: "Gerenciamento de Administradores" }), _jsx("p", { className: "text-sm text-muted-foreground mb-6", children: "Promova outros usu\u00E1rios para o cargo de administrador ou validador." }), _jsx(SetAdminRole, {})] }) }))] }) }), isEditing && (_jsx(EventFormModal, { currentEvent: currentEvent, onSave: handleSave, onClose: handleCloseModal })), selectedEventForAttendees && (_jsx(AttendeeList, { eventId: selectedEventForAttendees.id, eventName: selectedEventForAttendees.title, onClose: () => setSelectedEventForAttendees(null) }))] }));
}
