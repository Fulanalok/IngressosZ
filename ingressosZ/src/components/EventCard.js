import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { eventService } from "../services/firestore";
function EventCard({ event }) {
    const queryClient = useQueryClient();
    const rootRef = useRef(null);
    const imagePrefetchedRef = useRef(false);
    const prefetchDetails = useCallback(() => {
        queryClient.prefetchQuery({
            queryKey: ["event", event.id],
            queryFn: () => eventService.getEventById(event.id),
        });
        // Pré-carregar também o chunk da página de detalhes
        import("../pages/EventDetailPage").catch(() => void 0);
        if (!imagePrefetchedRef.current && event.image) {
            imagePrefetchedRef.current = true;
            const img = new Image();
            img.src = event.image;
        }
    }, [queryClient, event.id, event.image]);
    useEffect(() => {
        const el = rootRef.current;
        if (!el)
            return;
        let didPrefetch = false;
        const observer = new IntersectionObserver((entries) => {
            for (const entry of entries) {
                if (entry.isIntersecting && !didPrefetch) {
                    didPrefetch = true;
                    prefetchDetails();
                    observer.disconnect();
                    break;
                }
            }
        }, { rootMargin: "100px" });
        observer.observe(el);
        return () => observer.disconnect();
    }, [prefetchDetails]);
    const formattedDate = useMemo(() => {
        const date = new Date(event.date);
        return date.toLocaleDateString("pt-BR", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
        });
    }, [event.date]);
    const formattedTime = useMemo(() => {
        return event.time.slice(0, 5);
    }, [event.time]);
    const getCategoryColor = (category) => {
        const colors = {
            Música: "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200",
            Gastronomia: "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200",
            Tecnologia: "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200",
            Entretenimento: "bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200",
            Educação: "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200",
            Esporte: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200",
        };
        return (colors[category] ||
            "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200");
    };
    return (_jsxs("div", { ref: rootRef, className: "group card hover:shadow-large transition-all duration-300 hover:-translate-y-1 max-w-sm bg-background", onMouseEnter: prefetchDetails, onFocus: prefetchDetails, children: [event.image && (_jsxs("div", { className: "relative mb-4 overflow-hidden rounded-t-xl", children: [_jsx("img", { src: event.image, alt: event.title, loading: "lazy", decoding: "async", className: "w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105" }), _jsx("div", { className: "absolute top-3 left-3", children: _jsx("span", { className: `px-2 py-1 text-xs font-medium rounded-none ${getCategoryColor(event.category)}`, children: event.category }) }), event.availableTickets <= 10 && event.availableTickets > 0 && (_jsx("div", { className: "absolute top-3 right-3", children: _jsx("span", { className: "bg-red-500 text-white px-2 py-1 text-xs font-medium rounded-none", children: "\u00DAltimos ingressos!" }) }))] })), _jsxs("div", { className: "space-y-3", children: [_jsx("h3", { className: "text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors", children: event.title }), _jsxs("div", { className: "space-y-2 text-sm text-muted-foreground", children: [_jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "font-medium", children: "Data:" }), _jsx("span", { className: "ml-1", children: formattedDate })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "font-medium", children: "Hor\u00E1rio:" }), _jsx("span", { className: "ml-1", children: formattedTime })] }), _jsxs("div", { className: "flex items-center", children: [_jsx("span", { className: "font-medium", children: "Local:" }), _jsx("span", { className: "ml-1 truncate", children: event.location })] })] }), _jsxs("div", { className: "flex items-center justify-between", children: [_jsx("div", { className: "flex items-center text-primary", children: _jsxs("span", { className: "text-xl font-bold", children: ["R$ ", (event.pricing?.standard ?? event.price ?? 0).toFixed(2)] }) }), _jsxs("div", { className: `text-xs font-medium transition-all duration-500 ${event.availableTickets > 10
                                    ? "text-gray-500 dark:text-gray-400"
                                    : "text-red-600 dark:text-red-400 font-bold animate-pulse"}`, children: [event.availableTickets, " dispon\u00EDveis"] })] }), _jsx("div", { className: "w-full bg-muted rounded-none h-1.5", children: _jsx("div", { className: "bg-gradient-to-r from-primary to-accent h-1.5 rounded-none transition-all duration-300", style: {
                                width: `${((event.maxTickets - event.availableTickets) /
                                    event.maxTickets) *
                                    100}%`,
                            } }) }), _jsx(Button, { asChild: true, className: "w-full", disabled: event.availableTickets === 0, children: _jsx(Link, { to: `/evento/${event.id}`, className: "block", onMouseEnter: prefetchDetails, onFocus: prefetchDetails, children: event.availableTickets > 0 ? (_jsx("span", { className: "flex items-center justify-center", children: "Ver Detalhes & Comprar" })) : (_jsx("span", { className: "flex items-center justify-center", children: "Esgotado" })) }) })] })] }));
}
export default memo(EventCard);
