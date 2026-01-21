import { useEffect, useMemo, useRef, useState } from "react";
import type { GridChildComponentProps } from "react-window";
import { FixedSizeGrid as Grid } from "react-window";
import EventCard from "../components/EventCard";
import { Button } from "../components/ui/button";
import { Input } from "../components/ui/input";
import { useAuth } from "../hooks/useAuth";
import { useEvents } from "../hooks/useEvents";

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
  const { events, loading, error, refetch } = useEvents();
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("Todos");
  const [dateFilter, setDateFilter] = useState("");
  const [maxPrice, setMaxPrice] = useState<number | "">("");
  const debouncedSearchTerm = useDebouncedValue(searchTerm, 300);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [gridWidth, setGridWidth] = useState(0);
  const [gridHeight, setGridHeight] = useState(800);
  const [columns, setColumns] = useState(1);
  const CARD_HEIGHT = 420;
  const [useVirtualization, setUseVirtualization] = useState(false);

  // Get unique categories
  const categories = useMemo(
    () => [
      "Todos",
      ...Array.from(new Set(events.map((event) => event.category))),
    ],
    [events]
  );

  // Filter events
  const filteredEvents = useMemo(() => {
    const s = debouncedSearchTerm.trim().toLowerCase();
    return events.filter((event) => {
      const matchesSearch =
        s.length === 0 ||
        event.title.toLowerCase().includes(s) ||
        event.location.toLowerCase().includes(s);
      const matchesCategory =
        selectedCategory === "Todos" || event.category === selectedCategory;
      const matchesDate = !dateFilter || event.date === dateFilter;
      const matchesPrice = maxPrice === "" || event.price <= Number(maxPrice);
      return matchesSearch && matchesCategory && matchesDate && matchesPrice;
    });
  }, [events, debouncedSearchTerm, selectedCategory, dateFilter, maxPrice]);

  useEffect(() => {
    const title = "IngressosZ — Eventos Disponíveis";
    const description =
      "Explore e compre ingressos para eventos com segurança e rapidez.";
    document.title = title;
    const setMeta = (name: string, content: string) => {
      let tag = document.querySelector(
        `meta[name='${name}']`
      ) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("name", name);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    const setProperty = (property: string, content: string) => {
      let tag = document.querySelector(
        `meta[property='${property}']`
      ) as HTMLMetaElement | null;
      if (!tag) {
        tag = document.createElement("meta");
        tag.setAttribute("property", property);
        document.head.appendChild(tag);
      }
      tag.setAttribute("content", content);
    };
    setMeta("description", description);
    setProperty("og:title", title);
    setProperty("og:description", description);
  }, []);

  useEffect(() => {
    const measure = () => {
      const w = containerRef.current?.clientWidth || window.innerWidth;
      setGridWidth(w);
      // Aproximação da altura disponível da viewport menos cabeçalho/filtros
      const headerAndFilters = 280;
      const h = Math.max(360, window.innerHeight - headerAndFilters);
      setGridHeight(h);
      if (w >= 1280) setColumns(4);
      else if (w >= 1024) setColumns(3);
      else if (w >= 768) setColumns(2);
      else setColumns(1);
      setUseVirtualization(filteredEvents.length > 12);
    };
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [filteredEvents.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="animate-spin rounded-none h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <h2 className="text-xl font-semibold text-foreground">
            🎫 Carregando eventos...
          </h2>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center transition-colors">
        <div className="text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-foreground mb-2">
            Erro ao carregar eventos
          </h2>
          <p className="text-muted-foreground mb-6">{error}</p>
          <Button onClick={() => refetch()}>Tentar Novamente</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen gradient-bg transition-colors">
      {/* Header */}
      <header className="nav-bg transition-colors">
        <div className="page-container">
          <div className="py-6">
            <div className="flex justify-between items-center mb-4">
              <h1 className="text-3xl font-bold text-foreground">
                🎫 Eventos Disponíveis
              </h1>
              <Button onClick={() => refetch()} variant="secondary" size="sm">
                🔄 Atualizar
              </Button>
            </div>

            <p className="text-muted-foreground mb-6">
              Bem-vindo, {userProfile?.displayName || userProfile?.email}!
            </p>
          </div>
        </div>
      </header>

      {/* Filters */}
      <div className="bg-background border-b border-border transition-colors">
        <div className="page-container py-6">
          <div className="flex flex-col md:flex-row gap-4">
            {/* Search */}
            <div className="flex-1" role="search">
              <div className="relative">
                <Input
                  type="text"
                  placeholder="Buscar eventos ou locais..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                  aria-label="Buscar eventos ou locais"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <span className="text-muted-foreground">🔍</span>
                </div>
              </div>
            </div>

            {/* Category Filter */}
            <div className="md:w-64">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="w-full rounded-none border-input bg-background text-foreground px-3 py-2 shadow-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                aria-label="Filtrar por categoria"
              >
                {categories.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="page-container py-8">
        {/* Results Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h2 className="text-2xl font-bold text-foreground">
              🎉 {filteredEvents.length}{" "}
              {filteredEvents.length === 1
                ? "Evento Encontrado"
                : "Eventos Encontrados"}
            </h2>
            {searchTerm && (
              <p className="text-muted-foreground mt-1">
                Resultados para "{searchTerm}"
                {selectedCategory !== "Todos" && ` em ${selectedCategory}`}
              </p>
            )}
          </div>

          <div className="text-sm text-muted-foreground">
            Total de {events.length} eventos disponíveis
          </div>
        </div>

        {/* Events Grid */}
        {filteredEvents.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-6xl mb-4">😔</div>
            <h3 className="text-xl font-semibold text-foreground mb-2">
              {searchTerm
                ? "Nenhum evento encontrado"
                : "Nenhum evento disponível"}
            </h3>
            <p className="text-muted-foreground mb-6">
              {searchTerm
                ? "Tente alterar os filtros ou buscar por outros termos."
                : "Volte em breve para conferir novos eventos!"}
            </p>
            {searchTerm && (
              <Button
                onClick={() => {
                  setSearchTerm("");
                  setSelectedCategory("Todos");
                }}
              >
                Limpar Filtros
              </Button>
            )}
          </div>
        ) : (
          <div ref={containerRef}>
            {useVirtualization && gridWidth > 0 ? (
              <Grid
                columnCount={columns}
                columnWidth={Math.floor(gridWidth / columns)}
                height={gridHeight}
                rowCount={Math.ceil(filteredEvents.length / columns)}
                rowHeight={CARD_HEIGHT}
                width={gridWidth}
              >
                {(props: GridChildComponentProps) => {
                  const { columnIndex, rowIndex, style } = props;
                  const index = rowIndex * columns + columnIndex;
                  const event = filteredEvents[index];
                  if (!event) return null;
                  return (
                    <div style={style} className="p-3">
                      <EventCard key={event.id} event={event} />
                    </div>
                  );
                }}
              </Grid>
            ) : (
              <div
                className={`grid gap-6 ${
                  columns >= 4
                    ? "xl:grid-cols-4"
                    : columns === 3
                    ? "lg:grid-cols-3"
                    : columns === 2
                    ? "md:grid-cols-2"
                    : "grid-cols-1"
                }`}
              >
                {filteredEvents.map((event) => (
                  <div key={event.id} className="p-3">
                    <EventCard event={event} />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Quick Stats */}
        {events.length > 0 && (
          <div className="mt-16 grid grid-cols-2 md:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold text-primary">
                {events.length}
              </div>
              <div className="text-muted-foreground">Eventos Ativos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {events.filter((e) => e.availableTickets > 0).length}
              </div>
              <div className="text-muted-foreground">Com Ingressos</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                {categories.length - 1}
              </div>
              <div className="text-muted-foreground">Categorias</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold text-foreground">
                R$ {Math.min(...events.map((e) => e.price)).toFixed(0)}
              </div>
              <div className="text-muted-foreground">A partir de</div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

export default EventsPage;
