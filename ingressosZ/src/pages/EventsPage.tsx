import { useEffect, useMemo, useState } from "react";
import { useInView } from 'react-intersection-observer';
import EventCard from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/EventCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { useEvents } from "@/hooks/useEvents";
import type { Event } from "@/types";

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function EventsPage() {
  const { userProfile } = useAuth();
  const {
    data: events = [],
    status,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEvents();

  // Filter states
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [locationFilter, setLocationFilter] = useState("Todos");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);

  const { ref, inView } = useInView({ threshold: 0 });

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const { categories, locations } = useMemo(() => {
    const allCategories = new Set(events.map((event: Event) => event.category));
    const allLocations = new Set(events.map((event: Event) => event.location));
    return {
      categories: ["Todos", ...Array.from(allCategories)],
      locations: ["Todos", ...Array.from(allLocations)],
    };
  }, [events]);

  const filteredEvents = useMemo(() => {
    const s = debouncedSearchTerm.trim().toLowerCase();
    return events.filter((event: Event) => {
      const matchesSearch = s.length === 0 || event.title.toLowerCase().includes(s);
      const matchesCategory = selectedCategory === "Todos" || event.category === selectedCategory;
      const matchesLocation = locationFilter === "Todos" || event.location === locationFilter;
      const matchesPrice = maxPrice === "" || event.price <= Number(maxPrice);
      return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
    });
  }, [events, debouncedSearchTerm, selectedCategory, locationFilter, maxPrice]);

  if (status === 'pending' && events.length === 0) {
    return (
      <div className="min-h-screen gradient-bg">
        <header className="nav-bg py-6">
          <div className="page-container">
            <div className="h-10 w-64 bg-muted animate-pulse rounded mb-4"></div>
            <div className="h-4 w-48 bg-muted animate-pulse rounded mb-6"></div>
          </div>
        </header>
        <main className="page-container py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => <EventCardSkeleton key={i} />)}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold">Erro ao carregar eventos</h2>
          <p className="text-muted-foreground mb-4">{error.message}</p>
          <Button onClick={() => window.location.reload()}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg">
      <header className="nav-bg py-6 border-b border-border">
        <div className="page-container">
          <h1 className="text-3xl font-bold text-foreground mb-2">🎫 Eventos Disponíveis</h1>
          <p className="text-muted-foreground">Bem-vindo, {userProfile?.displayName || userProfile?.email}!</p>
        </div>
      </header>

      <div className="sticky top-0 z-10 bg-background/80 backdrop-blur-md border-b border-border py-4">
        <div className="page-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <Input
            type="text"
            placeholder="Buscar por nome..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="lg:col-span-1"
          />
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="w-full rounded-md border-input bg-background px-3 py-2"
          >
            {locations.map((loc) => <option key={loc as string} value={loc as string}>{loc as string}</option>)}
          </select>
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full rounded-md border-input bg-background px-3 py-2"
          >
            {categories.map((cat) => <option key={cat as string} value={cat as string}>{cat as string}</option>)}
          </select>
          <Input
            type="number"
            placeholder="Preço máximo (R$)"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value === '' ? '' : Number(e.target.value))}
            className="w-full"
            min="0"
          />
        </div>
      </div>

      <main className="page-container py-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
          {filteredEvents.map((event: Event) => <EventCard key={event.id} event={event} />)}
        </div>

        <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
          {isFetchingNextPage ? (
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
              <span>Carregando mais...</span>
            </div>
          ) : !hasNextPage && events.length > 0 ? (
            <p className="text-muted-foreground">Fim dos resultados.</p>
          ) : null}
        </div>

        {filteredEvents.length === 0 && !isFetchingNextPage && (
          <div className="text-center py-16 col-span-full">
            <h3 className="text-xl font-semibold">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground">Tente ajustar seus filtros ou volte mais tarde.</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default EventsPage;
