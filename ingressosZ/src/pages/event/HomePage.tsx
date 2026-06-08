import { useQueryClient } from "@tanstack/react-query";
import {
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  TicketCheck,
  WalletCards,
} from "lucide-react";
import { Link } from "react-router";
import EventCard from "@/components/event/EventCard";
import { EventCardSkeleton } from "@/components/event/EventCardSkeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { USER_ROLES } from "@/constants/roles";
import { useAuth } from "@/hooks/auth/useAuth";
import { useEvents } from "@/hooks/event/useEvents";
import { formatDisplayDate } from "@/lib/date";
import { eventService } from "@/services/firestore";
import type { Event } from "@/types";

function HomePage() {
  const { userProfile } = useAuth();
  const { data: events = [], status } = useEvents();
  const queryClient = useQueryClient();

  const isLoading = status === "pending";
  const featuredEvents = events.slice(0, 4);
  const showFeaturedSection = isLoading || featuredEvents.length > 0;
  const highlightedEvent = featuredEvents[0];
  const isOrganizer = userProfile?.role === USER_ROLES.ORGANIZER;
  const canValidate =
    userProfile?.role === USER_ROLES.ORGANIZER ||
    userProfile?.role === USER_ROLES.VALIDATOR;

  const prefetchEvents = () => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ["events", 10],
      queryFn: ({
        pageParam,
      }: {
        pageParam:
          | QueryDocumentSnapshot<DocumentData, DocumentData>
          | undefined;
      }) => eventService.getEvents(10, pageParam),
      initialPageParam: undefined,
      getNextPageParam: () => undefined,
    });
  };

  return (
    <div className="min-h-screen page-bg">
      <main className="showcase-container">
        <section className="grid min-w-0 gap-8 py-8 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:py-14">
          <div className="min-w-0 max-w-2xl">
            <div className="inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground">
              <TicketCheck className="h-4 w-4 text-primary" />
              Ingressos, pagamento e portaria
            </div>

            <h1 className="mt-5 max-w-2xl text-4xl font-bold leading-[1.03] text-foreground sm:text-5xl lg:text-6xl">
              Encontre eventos e compre seu ingresso com QR Code
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Venda, compra e validação reunidas em um fluxo direto para eventos
              pequenos e médios.
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg" className="h-12 px-6">
                <Link
                  to="/eventos"
                  onMouseEnter={prefetchEvents}
                  onFocus={prefetchEvents}
                >
                  Ver eventos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="secondary"
                className="h-12 px-6"
              >
                <Link to="/login">Acessar conta</Link>
              </Button>
            </div>
          </div>

          <div className="min-w-0 overflow-hidden border border-border bg-card">
            <div className="flex items-start justify-between gap-4 border-b border-border px-5 py-4">
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Destaque
              </p>
              <p className="text-right text-sm text-muted-foreground">
                {highlightedEvent?.category ?? "Evento"}
              </p>
            </div>

            <div className="relative aspect-[16/10] bg-muted">
              {highlightedEvent?.image ? (
                <img
                  src={highlightedEvent.image}
                  alt={highlightedEvent.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-background">
                  <TicketCheck className="h-16 w-16 text-muted-foreground" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 border-t border-white/10 bg-black/90 p-5 text-white">
                {isLoading && !highlightedEvent ? (
                  <Skeleton className="h-7 w-3/4 bg-white/30" />
                ) : (
                  <h2 className="text-2xl font-bold sm:text-3xl">
                    {highlightedEvent?.title ?? "Festival IngressosZ"}
                  </h2>
                )}
              </div>
            </div>

            <div className="grid gap-0 border-t border-border bg-card sm:grid-cols-3">
              <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
                <CalendarDays className="mb-3 h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Data
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  {highlightedEvent?.date
                    ? formatDisplayDate(highlightedEvent.date)
                    : "Em breve"}
                </p>
              </div>
              <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
                <MapPin className="mb-3 h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  Local
                </p>
                <p className="mt-1 truncate font-semibold text-foreground">
                  {highlightedEvent?.location ?? "Brasil"}
                </p>
              </div>
              <div className="p-4">
                <WalletCards className="mb-3 h-5 w-5 text-muted-foreground" />
                <p className="text-xs font-medium text-muted-foreground">
                  A partir de
                </p>
                <p className="mt-1 font-semibold text-foreground">
                  R$ {highlightedEvent?.price ?? 80}
                </p>
              </div>
            </div>

            <div className="border-t border-border p-5">
              <Button asChild className="w-full">
                <Link
                  to={
                    highlightedEvent ? `/evento/${highlightedEvent.id}` : "/eventos"
                  }
                  onMouseEnter={prefetchEvents}
                  onFocus={prefetchEvents}
                >
                  Comprar ingresso
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </div>
        </section>

        {showFeaturedSection && (
          <section className="mb-20">
            <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-foreground">
                  Eventos em Destaque
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Eventos disponíveis para compra online.
                </p>
              </div>
              <Button variant="ghost" asChild className="self-start sm:self-auto">
                <Link to="/eventos">
                  Ver todos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="grid min-w-0 gap-5 md:grid-cols-2 2xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <EventCardSkeleton key={`featured-skeleton-${i}`} />
                ))}
              </div>
            ) : (
              <div className="grid min-w-0 gap-5 md:grid-cols-2 2xl:grid-cols-4">
                {featuredEvents.map((event: Event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        )}

        {canValidate && (
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-bold text-foreground">
              Acesso rápido
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              {isOrganizer && (
                <Link to="/admin" className="group">
                  <Card className="group-hover:border-primary group-hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div>
                        <CardTitle>Painel Administrativo</CardTitle>
                        <CardDescription>
                          Gerencie eventos, vendas e relatórios
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )}

              {canValidate && (
                <Link to="/validador" className="group">
                  <Card className="group-hover:border-primary group-hover:shadow-md">
                    <CardHeader className="flex flex-row items-center gap-4">
                      <div>
                        <CardTitle>Validador de Ingressos</CardTitle>
                        <CardDescription>
                          Escaneie e valide ingressos na portaria
                        </CardDescription>
                      </div>
                    </CardHeader>
                  </Card>
                </Link>
              )}
            </div>
          </section>
        )}
      </main>
    </div>
  );
}

export default HomePage;
