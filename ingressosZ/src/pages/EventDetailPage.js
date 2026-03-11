import { jsx as _jsx, jsxs as _jsxs, Fragment as _Fragment } from "react/jsx-runtime";
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Helmet } from "@dr.pogodin/react-helmet";
import { useEvent } from "@/hooks/useEvents";
import { useAuth } from "@/hooks/useAuth";
import { TicketPurchase, ShareButtons } from "@/components/event";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { FiCalendar, FiClock, FiMapPin, FiChevronLeft } from "react-icons/fi";
function EventDetailSkeleton() {
    return (_jsxs("div", { className: "container mx-auto px-4 py-8 max-w-4xl animate-pulse", children: [_jsx("div", { className: "bg-gray-300 h-8 w-1/4 mb-4 rounded" }), _jsxs("div", { className: "bg-white shadow-2xl rounded-lg overflow-hidden", children: [_jsx("div", { className: "bg-gray-300 h-64 w-full" }), _jsxs("div", { className: "p-6 md:p-8", children: [_jsx("div", { className: "bg-gray-300 h-8 w-3/4 mb-4 rounded" }), _jsxs("div", { className: "flex items-center text-gray-400 mb-6 space-x-4", children: [_jsx("div", { className: "bg-gray-300 h-6 w-1/2 rounded" }), _jsx("div", { className: "bg-gray-300 h-6 w-1/2 rounded" })] }), _jsx("div", { className: "bg-gray-300 h-6 w-full mb-4 rounded" }), _jsx("div", { className: "bg-gray-300 h-6 w-full mb-4 rounded" }), _jsx("div", { className: "bg-gray-300 h-6 w-2/3 rounded" })] })] })] }));
}
export function EventDetailPage() {
    const { eventId } = useParams();
    const navigate = useNavigate();
    const { user, loading: authLoading } = useAuth();
    const { data: event, status, error } = useEvent(eventId);
    const [showPurchase, setShowPurchase] = useState(false);
    if (status === "pending" || authLoading) {
        return _jsx(EventDetailSkeleton, {});
    }
    if (status === "error") {
        return (_jsxs("div", { className: "text-center py-10 text-red-500", children: ["Erro ao carregar o evento: ", error?.message] }));
    }
    if (!event) {
        return (_jsxs("div", { className: "text-center py-10", children: [_jsx("h2", { className: "text-2xl font-bold mb-4", children: "Evento n\u00E3o encontrado" }), _jsx("p", { className: "mb-6", children: "O evento que voc\u00EA est\u00E1 procurando n\u00E3o existe ou foi removido." }), _jsx("button", { onClick: () => navigate("/"), className: "bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors", children: "Voltar para Home" })] }));
    }
    const eventDate = new Date(event.date);
    const formattedDate = format(eventDate, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR });
    const pageTitle = `${event.title} - IngressosZ`;
    const pageDescription = event.description.substring(0, 160);
    const pageUrl = window.location.href;
    return (_jsxs(_Fragment, { children: [_jsxs(Helmet, { children: [_jsx("title", { children: pageTitle }), _jsx("meta", { name: "description", content: pageDescription }), _jsx("meta", { property: "og:title", content: pageTitle }), _jsx("meta", { property: "og:description", content: pageDescription }), _jsx("meta", { property: "og:image", content: event.image }), _jsx("meta", { property: "og:url", content: pageUrl }), _jsx("meta", { property: "og:type", content: "website" }), _jsx("meta", { name: "twitter:card", content: "summary_large_image" })] }), _jsxs("div", { className: "container mx-auto px-4 py-8 max-w-4xl", children: [_jsxs("button", { onClick: () => navigate(-1), className: "flex items-center text-blue-600 hover:text-blue-800 mb-4 transition-colors", children: [_jsx(FiChevronLeft, { className: "mr-1" }), "Voltar"] }), _jsxs("div", { className: "bg-white shadow-2xl rounded-lg overflow-hidden", children: [event.image && (_jsx("img", { src: event.image, alt: event.title, className: "w-full h-64 object-cover" })), _jsxs("div", { className: "p-6 md:p-8", children: [_jsx("h1", { className: "text-3xl md:text-4xl font-extrabold text-gray-900 mb-3", children: event.title }), _jsxs("div", { className: "flex flex-wrap items-center text-gray-600 mb-6 gap-x-6 gap-y-2", children: [_jsxs("div", { className: "flex items-center", children: [_jsx(FiCalendar, { className: "mr-2 text-blue-500" }), _jsx("span", { children: formattedDate })] }), _jsxs("div", { className: "flex items-center", children: [_jsx(FiClock, { className: "mr-2 text-blue-500" }), _jsx("span", { children: event.time })] })] }), _jsxs("div", { className: "flex items-center text-gray-700 mb-8", children: [_jsx(FiMapPin, { className: "mr-2 text-red-500" }), _jsxs("a", { href: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(event.address)}`, target: "_blank", rel: "noopener noreferrer", className: "hover:underline", children: [event.location, " - ", event.address] })] }), _jsx("div", { className: "prose prose-lg max-w-none text-gray-800 mb-8", children: _jsx("p", { children: event.description }) }), _jsx(ShareButtons, { url: pageUrl, title: event.title }), _jsx("div", { className: "mt-8 pt-6 border-t border-gray-200", children: event.availableTickets > 0 ? (_jsx("button", { onClick: () => setShowPurchase(true), className: "w-full bg-green-600 text-white font-bold py-3 px-6 rounded-lg hover:bg-green-700 transition-transform transform hover:scale-105 shadow-lg", children: "Comprar Ingressos" })) : (_jsx("div", { className: "text-center bg-red-100 p-4 rounded-lg", children: _jsx("p", { className: "font-bold text-red-700", children: "Ingressos Esgotados!" }) })) })] })] }), showPurchase && (_jsx(TicketPurchase, { event: event, user: user, onClose: () => setShowPurchase(false) }))] })] }));
}
export default EventDetailPage;
