import { jsx as _jsx, jsxs as _jsxs } from "react/jsx-runtime";
import { useEffect, useMemo, useState } from "react";
import { useInView } from 'react-intersection-observer';
import EventCard from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/EventCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEvents } from "@/hooks/useEvents";
function useDebouncedValue(value, delay) {
    const [debounced, setDebounced] = useState(value);
    useEffect(() => {
        const id = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(id);
    }, [value, delay]);
    return debounced;
}
function EventsPage() {
    const { userProfile } = useAuth();
    const { data: events = [], status, error, fetchNextPage, hasNextPage, isFetchingNextPage, } = useEvents();
    // Filter states
    const [searchTerm, setSearchTerm] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("Todos");
    const [locationFilter, setLocationFilter] = useState("Todos");
    const [maxPrice, setMaxPrice] = useState("");
    const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
    const { ref, inView } = useInView({ threshold: 0 });
    useEffect(() => {
        if (inView && hasNextPage && !isFetchingNextPage) {
            fetchNextPage();
        }
    }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);
    const { categories, locations } = useMemo(() => {
        const allCategories = new Set(events.map((event) => event.category));
        const allLocations = new Set(events.map((event) => event.location));
        return {
            categories: ["Todos", ...Array.from(allCategories)],
            locations: ["Todos", ...Array.from(allLocations)],
        };
    }, [events]);
    const filteredEvents = useMemo(() => {
        const s = debouncedSearchTerm.trim().toLowerCase();
        return events.filter((event) => {
            const matchesSearch = s.length === 0 || event.title.toLowerCase().includes(s);
            const matchesCategory = selectedCategory === "Todos" || event.category === selectedCategory;
            const matchesLocation = locationFilter === "Todos" || event.location === locationFilter;
            const matchesPrice = maxPrice === "" || event.price <= Number(maxPrice);
            return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
        });
    }, [events, debouncedSearchTerm, selectedCategory, locationFilter, maxPrice]);
    if (status === 'pending' && events.length === 0) {
        return (_jsxs("div", { className: "min-h-screen gradient-bg", children: [_jsx("header", { className: "nav-bg py-6", children: _jsxs("div", { className: "page-container", children: [_jsx("div", { className: "h-10 w-64 bg-muted animate-pulse rounded mb-4" }), _jsx("div", { className: "h-4 w-48 bg-muted animate-pulse rounded mb-6" })] }) }), _jsx("main", { className: "page-container py-8", children: _jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8", children: [...Array(8)].map((_, i) => _jsx(EventCardSkeleton, {}, i)) }) })] }));
    }
    if (error) {
        return (_jsx("div", { className: "min-h-screen flex items-center justify-center", children: _jsxs("div", { className: "text-center", children: [_jsx("h2", { className: "text-2xl font-bold", children: "Erro ao carregar eventos" }), _jsx("p", { className: "text-muted-foreground mb-4", children: error.message }), _jsx(Button, { onClick: () => window.location.reload(), children: "Tentar Novamente" })] }) }));
    }
    return (_jsxs("div", { className: "min-h-screen gradient-bg", children: [_jsx("header", { className: "nav-bg py-6 border-b border-border", children: _jsxs("div", { className: "page-container", children: [_jsx("h1", { className: "text-3xl font-bold text-foreground mb-2", children: "\uD83C\uDFAB Eventos Dispon\u00EDveis" }), _jsxs("p", { className: "text-muted-foreground", children: ["Bem-vindo, ", userProfile?.displayName || userProfile?.email, "!"] })] }) }), _jsx("div", { className: "sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border py-4", children: _jsxs("div", { className: "page-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4", children: [_jsx(Input, { type: "text", placeholder: "Buscar por nome...", value: searchTerm, onChange: (e) => setSearchTerm(e.target.value), className: "lg:col-span-1" }), _jsx("select", { value: locationFilter, onChange: (e) => setLocationFilter(e.target.value), className: "w-full rounded-md border-input bg-background px-3 py-2", children: locations.map((loc) => _jsx("option", { value: loc, children: loc }, loc)) }), _jsx("select", { value: selectedCategory, onChange: (e) => setSelectedCategory(e.target.value), className: "w-full rounded-md border-input bg-background px-3 py-2", children: categories.map((cat) => _jsx("option", { value: cat, children: cat }, cat)) }), _jsx(Input, { type: "number", placeholder: "Pre\u00E7o m\u00E1ximo (R$)", value: maxPrice, onChange: (e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value)), className: "w-full", min: "0" })] }) }), _jsxs("main", { className: "page-container py-8", children: [_jsx("div", { className: "grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8", children: filteredEvents.map((event) => _jsx(EventCard, { event: event }, event.id)) }), _jsx("div", { ref: ref, className: "h-10 mt-8 flex justify-center items-center", children: isFetchingNextPage ? (_jsxs("div", { className: "flex items-center gap-2 text-muted-foreground", children: [_jsx("div", { className: "w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" }), _jsx("span", { children: "Carregando mais..." })] })) : !hasNextPage && events.length > 0 ? (_jsx("p", { className: "text-muted-foreground", children: "Fim dos resultados." })) : null }), filteredEvents.length === 0 && !isFetchingNextPage && (_jsxs("div", { className: "text-center py-16 col-span-full", children: [_jsx("h3", { className: "text-xl font-semibold", children: "Nenhum evento encontrado" }), _jsx("p", { className: "text-muted-foreground", children: "Tente ajustar seus filtros ou volte mais tarde." })] }))] })] }));
}
export default EventsPage;
