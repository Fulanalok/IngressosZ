import { ChevronDown, MapPin, RefreshCcw, Search, Tag } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import EventCard from "@/components/event/EventCard";
import { EventCardSkeleton } from "@/components/event/EventCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents } from "@/hooks/event/useEvents";
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
  const {
    data: events = [],
    status,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = useEvents();

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [locationFilter, setLocationFilter] = useState("Todos");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const debouncedCategory = useDebouncedValue(selectedCategory, 200);
  const debouncedLocation = useDebouncedValue(locationFilter, 200);
  const debouncedMaxPrice = useDebouncedValue(maxPrice, 200);
  const isFiltering =
    searchTerm !== debouncedSearchTerm ||
    selectedCategory !== debouncedCategory ||
    locationFilter !== debouncedLocation ||
    maxPrice !== debouncedMaxPrice;

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
      const matchesSearch =
        s.length === 0 || event.title.toLowerCase().includes(s);
      const matchesCategory =
        debouncedCategory === "Todos" || event.category === debouncedCategory;
      const matchesLocation =
        debouncedLocation === "Todos" || event.location === debouncedLocation;
      const matchesPrice =
        debouncedMaxPrice === "" || event.price <= Number(debouncedMaxPrice);
      return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
    });
  }, [
    events,
    debouncedSearchTerm,
    debouncedCategory,
    debouncedLocation,
    debouncedMaxPrice,
  ]);

  if (status === "pending" && events.length === 0) {
    return (
      <div className="min-h-screen page-bg">
        <header className="border-b border-border">
          <div className="showcase-container py-8">
            <Skeleton className="mb-4 h-10 w-64" />
            <Skeleton className="h-4 w-48" />
          </div>
        </header>
        <main className="showcase-container py-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {[...Array(6)].map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="surface-card mx-auto max-w-md p-10 text-center">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-red-900/30 bg-red-950/30 text-red-400">
            <RefreshCcw className="h-8 w-8" />
          </div>
          <h2 className="mb-4 text-2xl font-bold text-foreground">
            Erro ao carregar eventos
          </h2>
          <p className="mb-8 leading-relaxed text-muted-foreground">
            {error.message}
          </p>
          <Button onClick={() => window.location.reload()} className="w-full">
            Tentar novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <header className="border-b border-border">
        <div className="showcase-container py-8">
          <p className="mb-3 text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
            Eventos
          </p>
          <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl">
            Escolha seu ingresso
          </h1>
        </div>
      </header>

      <div className="border-b border-border bg-background">
        <div className="showcase-container grid min-w-0 grid-cols-1 gap-3 py-5 md:grid-cols-2 lg:grid-cols-4">
          <div className="group relative min-w-0">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
            <Input
              type="text"
              placeholder="Buscar por nome"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="h-11 border-border/50 bg-card pl-10 font-medium focus:ring-primary/20"
            />
          </div>

          <div className="group relative min-w-0">
            <MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="h-11 w-full appearance-none border border-border/50 bg-card py-2 pl-10 pr-4 font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {locations.map((loc) => (
                <option key={loc as string} value={loc as string}>
                  {loc as string === "Todos" ? "Todos os locais" : loc as string}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="group relative min-w-0">
            <Tag className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="h-11 w-full appearance-none border border-border/50 bg-card py-2 pl-10 pr-4 font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
            >
              {categories.map((cat) => (
                <option key={cat as string} value={cat as string}>
                  {cat as string === "Todos"
                    ? "Todas as categorias"
                    : cat as string}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          </div>

          <div className="group relative min-w-0">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground group-focus-within:text-primary">
              R$
            </span>
            <Input
              type="number"
              placeholder="Preço máximo"
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="h-11 border-border/50 bg-card pl-10 font-medium focus:ring-primary/20"
              min="0"
            />
          </div>
        </div>
      </div>

      <main className="showcase-container py-8">
        {isFiltering && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-2 w-2 bg-primary" />
            <span>Aplicando filtros...</span>
          </div>
        )}

        <div
          className={`grid min-w-0 grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3 ${
            isFiltering ? "opacity-60" : "opacity-100"
          }`}
        >
          {filteredEvents.map((event: Event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {isFiltering &&
            [...Array(3)].map((_, i) => (
              <EventCardSkeleton key={`filtering-skeleton-${i}`} />
            ))}
          {isFetchingNextPage &&
            [...Array(3)].map((_, i) => (
              <EventCardSkeleton key={`next-page-skeleton-${i}`} />
            ))}
        </div>

        <div ref={ref} className="mt-8 flex h-10 items-center justify-center">
          {!isFetchingNextPage && !hasNextPage && events.length > 0 ? (
            <p className="text-muted-foreground">Fim dos resultados.</p>
          ) : null}
        </div>

        {filteredEvents.length === 0 && !isFetchingNextPage && !isFiltering && (
          <div className="col-span-full py-16 text-center">
            <h3 className="text-xl font-semibold">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground">
              Ajuste os filtros ou volte mais tarde.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default EventsPage;
