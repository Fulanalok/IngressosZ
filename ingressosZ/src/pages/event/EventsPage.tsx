import EventCard from "@/components/event/EventCard";
import { EventCardSkeleton } from "@/components/event/EventCardSkeleton";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useEvents } from "@/hooks/event/useEvents";
import type { Event } from "@/types";
import { useEffect, useMemo, useState } from "react";
import { useInView } from "react-intersection-observer";
import { Search, MapPin, Tag, ChevronDown, RefreshCcw } from "lucide-react";

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

  // Filter states
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
      return (
        matchesSearch && matchesCategory && matchesLocation && matchesPrice
      );
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
        <header className="nav-bg py-6">
          <div className="page-container">
            <Skeleton className="h-10 w-64 mb-4" />
            <Skeleton className="h-4 w-48 mb-6" />
          </div>
        </header>
        <main className="page-container py-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8">
            {[...Array(8)].map((_, i) => (
              <EventCardSkeleton key={i} />
            ))}
          </div>
        </main>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center p-12 surface-card max-w-md mx-auto">
          <div className="w-16 h-16 bg-red-50 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6">
            <RefreshCcw className="h-8 w-8" />
          </div>
          <h2 className="text-2xl font-extrabold text-foreground mb-4">Erro ao carregar eventos</h2>
          <p className="text-muted-foreground mb-8 leading-relaxed">{error.message}</p>
          <Button onClick={() => window.location.reload()} className="btn-primary w-full">
            Tentar Novamente
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen page-bg">
      <header className="border-b border-border py-10">
        <div className="page-container">
          <h1 className="mb-3 text-4xl font-bold leading-tight text-foreground">
            Descubra <span className="text-primary">Experiências</span>
          </h1>
          <p className="text-lg text-muted-foreground max-w-2xl font-medium">
            Explore os melhores eventos curados para você.
          </p>
        </div>
      </header>

      <div className="sticky top-20 z-30 border-b border-border bg-background py-6 shadow-sm">
        <div className="page-container grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="relative group">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
            <Input
              type="text"
              placeholder="Buscar por nome..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 h-12 bg-card border-border/50 rounded-xl focus:ring-primary/20 font-medium"
            />
          </div>

          <div className="relative group">
            <MapPin className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
            <select
              value={locationFilter}
              onChange={(e) => setLocationFilter(e.target.value)}
              className="w-full h-12 rounded-xl border border-border/50 bg-card pl-10 pr-4 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-foreground cursor-pointer"
            >
              {locations.map((loc) => (
                <option key={loc as string} value={loc as string}>
                  {loc as string === "Todos" ? "Todos os locais" : loc as string}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative group">
            <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground group-focus-within:text-primary" />
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="w-full h-12 rounded-xl border border-border/50 bg-card pl-10 pr-4 py-2 appearance-none focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary font-medium text-foreground cursor-pointer"
            >
              {categories.map((cat) => (
                <option key={cat as string} value={cat as string}>
                  {cat as string === "Todos" ? "Todas as categorias" : cat as string}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
          </div>

          <div className="relative group">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-black text-xs text-muted-foreground group-focus-within:text-primary">R$</span>
            <Input
              type="number"
              placeholder="Preço máximo"
              value={maxPrice}
              onChange={(e) =>
                setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="pl-10 h-12 bg-card border-border/50 rounded-xl focus:ring-primary/20 font-medium"
              min="0"
            />
          </div>
        </div>
      </div>

      <main className="page-container py-8">
        {isFiltering && (
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary animate-pulse" />
            <span>Aplicando filtros...</span>
          </div>
        )}
        <div
          className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-8 ${
            isFiltering ? "opacity-60" : "opacity-100"
          }`}
        >
          {filteredEvents.map((event: Event) => (
            <EventCard key={event.id} event={event} />
          ))}
          {isFiltering &&
            [...Array(4)].map((_, i) => (
              <EventCardSkeleton key={`filtering-skeleton-${i}`} />
            ))}
          {isFetchingNextPage &&
            [...Array(4)].map((_, i) => (
              <EventCardSkeleton key={`next-page-skeleton-${i}`} />
            ))}
        </div>

        <div ref={ref} className="h-10 mt-8 flex justify-center items-center">
          {!isFetchingNextPage && !hasNextPage && events.length > 0 ? (
            <p className="text-muted-foreground">Fim dos resultados.</p>
          ) : null}
        </div>

        {filteredEvents.length === 0 && !isFetchingNextPage && !isFiltering && (
          <div className="text-center py-16 col-span-full">
            <h3 className="text-xl font-semibold">Nenhum evento encontrado</h3>
            <p className="text-muted-foreground">
              Tente ajustar seus filtros ou volte mais tarde.
            </p>
          </div>
        )}
      </main>
    </div>
  );
}

export default EventsPage;
