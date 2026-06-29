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

type MaxPriceFilter = number | "";

interface EventFilters {
  category: string;
  location: string;
  maxPrice: MaxPriceFilter;
  search: string;
}

function useDebouncedValue<T>(value: T, delay: number) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function useEventFilters(events: Event[]) {
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [locationFilter, setLocationFilter] = useState("Todos");
  const [maxPrice, setMaxPrice] = useState<MaxPriceFilter>("");
  const debouncedCategory = useDebouncedValue(selectedCategory, 200);
  const debouncedLocation = useDebouncedValue(locationFilter, 200);
  const debouncedMaxPrice = useDebouncedValue(maxPrice, 200);
  const debouncedSearch = useDebouncedValue(searchTerm, 300);
  const debouncedFilters = useMemo<EventFilters>(
    () => ({
      category: debouncedCategory,
      location: debouncedLocation,
      maxPrice: debouncedMaxPrice,
      search: debouncedSearch,
    }),
    [debouncedCategory, debouncedLocation, debouncedMaxPrice, debouncedSearch]
  );
  const currentFilters: EventFilters = {
    category: selectedCategory,
    location: locationFilter,
    maxPrice,
    search: searchTerm,
  };
  const isFiltering = !areFiltersEqual(currentFilters, debouncedFilters);

  const filteredEvents = useMemo(
    () => events.filter((event) => matchesFilters(event, debouncedFilters)),
    [events, debouncedFilters]
  );

  return {
    filters: currentFilters,
    filteredEvents,
    isFiltering,
    setLocationFilter,
    setMaxPrice,
    setSearchTerm,
    setSelectedCategory,
  };
}

function areFiltersEqual(current: EventFilters, debounced: EventFilters) {
  return (
    current.search === debounced.search &&
    current.category === debounced.category &&
    current.location === debounced.location &&
    current.maxPrice === debounced.maxPrice
  );
}

function matchesFilters(event: Event, filters: EventFilters) {
  const search = filters.search.trim().toLowerCase();
  const matchesSearch =
    search.length === 0 || event.title.toLowerCase().includes(search);
  const matchesCategory =
    filters.category === "Todos" || event.category === filters.category;
  const matchesLocation =
    filters.location === "Todos" || event.location === filters.location;
  const matchesPrice =
    filters.maxPrice === "" || event.price <= Number(filters.maxPrice);

  return matchesSearch && matchesCategory && matchesLocation && matchesPrice;
}

function getFilterOptions(events: Event[]) {
  const categories = new Set(events.map((event) => event.category));
  const locations = new Set(events.map((event) => event.location));

  return {
    categories: ["Todos", ...Array.from(categories)],
    locations: ["Todos", ...Array.from(locations)],
  };
}

function LoadingPage() {
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

function ErrorPage({ error }: { error: Error }) {
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

function EventsHeader() {
  return (
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
  );
}

function EventsFilters({
  categories,
  filters,
  locations,
  setLocationFilter,
  setMaxPrice,
  setSearchTerm,
  setSelectedCategory,
}: {
  categories: string[];
  filters: EventFilters;
  locations: string[];
  setLocationFilter: (value: string) => void;
  setMaxPrice: (value: MaxPriceFilter) => void;
  setSearchTerm: (value: string) => void;
  setSelectedCategory: (value: string) => void;
}) {
  return (
    <div className="border-b border-border bg-background">
      <div className="showcase-container grid min-w-0 grid-cols-1 gap-3 py-5 md:grid-cols-2 lg:grid-cols-4">
        <div className="group relative min-w-0">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />
          <Input
            type="text"
            placeholder="Buscar por nome"
            value={filters.search}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="h-11 border-border/50 bg-card pl-10 font-medium focus:ring-primary/20"
          />
        </div>
        <SelectFilter
          icon={<MapPin className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />}
          labelForAll="Todos os locais"
          options={locations}
          value={filters.location}
          onChange={setLocationFilter}
        />
        <SelectFilter
          icon={<Tag className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary" />}
          labelForAll="Todas as categorias"
          options={categories}
          value={filters.category}
          onChange={setSelectedCategory}
        />
        <div className="group relative min-w-0">
          <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-muted-foreground group-focus-within:text-primary">
            R$
          </span>
          <Input
            type="number"
            placeholder="Preço máximo"
            value={filters.maxPrice}
            onChange={(e) =>
              setMaxPrice(e.target.value === "" ? "" : Number(e.target.value))
            }
            className="h-11 border-border/50 bg-card pl-10 font-medium focus:ring-primary/20"
            min="0"
          />
        </div>
      </div>
    </div>
  );
}

function SelectFilter({
  icon,
  labelForAll,
  onChange,
  options,
  value,
}: {
  icon: React.ReactNode;
  labelForAll: string;
  onChange: (value: string) => void;
  options: string[];
  value: string;
}) {
  return (
    <div className="group relative min-w-0">
      {icon}
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full appearance-none border border-border/50 bg-card py-2 pl-10 pr-4 font-medium text-foreground focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/20"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {option === "Todos" ? labelForAll : option}
          </option>
        ))}
      </select>
      <ChevronDown className="pointer-events-none absolute right-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
    </div>
  );
}

function EventsGrid({
  events,
  filteredEvents,
  hasNextPage,
  isFetchingNextPage,
  isFiltering,
  sentinelRef,
}: {
  events: Event[];
  filteredEvents: Event[];
  hasNextPage: boolean;
  isFetchingNextPage: boolean;
  isFiltering: boolean;
  sentinelRef: (node?: Element | null | undefined) => void;
}) {
  return (
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
        {filteredEvents.map((event) => (
          <EventCard key={event.id} event={event} />
        ))}
        <SkeletonRows isVisible={isFiltering} prefix="filtering" />
        <SkeletonRows isVisible={isFetchingNextPage} prefix="next-page" />
      </div>

      <div ref={sentinelRef} className="mt-8 flex h-10 items-center justify-center">
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
  );
}

function SkeletonRows({
  isVisible,
  prefix,
}: {
  isVisible: boolean;
  prefix: string;
}) {
  if (!isVisible) return null;

  return (
    <>
      {[...Array(3)].map((_, i) => (
        <EventCardSkeleton key={`${prefix}-skeleton-${i}`} />
      ))}
    </>
  );
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
  const { ref, inView } = useInView({ threshold: 0 });
  const { categories, locations } = useMemo(
    () => getFilterOptions(events),
    [events]
  );
  const {
    filters,
    filteredEvents,
    isFiltering,
    setLocationFilter,
    setMaxPrice,
    setSearchTerm,
    setSelectedCategory,
  } = useEventFilters(events);

  useEffect(() => {
    if (inView && hasNextPage && !isFetchingNextPage) {
      fetchNextPage();
    }
  }, [inView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  if (status === "pending" && events.length === 0) return <LoadingPage />;
  if (error) return <ErrorPage error={error} />;

  return (
    <div className="min-h-screen page-bg">
      <EventsHeader />
      <EventsFilters
        categories={categories}
        filters={filters}
        locations={locations}
        setLocationFilter={setLocationFilter}
        setMaxPrice={setMaxPrice}
        setSearchTerm={setSearchTerm}
        setSelectedCategory={setSelectedCategory}
      />
      <EventsGrid
        events={events}
        filteredEvents={filteredEvents}
        hasNextPage={hasNextPage}
        isFetchingNextPage={isFetchingNextPage}
        isFiltering={isFiltering}
        sentinelRef={ref}
      />
    </div>
  );
}

export default EventsPage;
