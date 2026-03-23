import { useQueryClient } from "@tanstack/react-query";
import { type DocumentData, type QueryDocumentSnapshot } from "firebase/firestore";
import { Link } from "react-router-dom";
import EventCard from "@/components/EventCard";
import { EventCardSkeleton } from "@/components/EventCardSkeleton";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useEvents } from "@/hooks/useEvents";
import { eventService } from "@/services/firestore";
import type { Event, PaginatedEvents } from "@/types";

function HomePage() {
  const { userProfile } = useAuth();
  const { data: events = [], status } = useEvents();
  const queryClient = useQueryClient();

  const isLoading = status === "pending";
  const featuredEvents = events.slice(0, 4);
  const showFeaturedSection = isLoading || featuredEvents.length > 0;
  const highlightedEvent = featuredEvents[0];

  const prefetchEvents = () => {
    queryClient.prefetchInfiniteQuery({
      queryKey: ["events"],
      queryFn: ({ pageParam }: { pageParam: QueryDocumentSnapshot<DocumentData> | undefined }) => eventService.getEvents(10, pageParam),
      initialPageParam: undefined,
      getNextPageParam: (lastPage: PaginatedEvents) => (lastPage.lastVisible ?? undefined) as any,
    });
  };

  return (
    <div className="min-h-screen gradient-bg">
      {/* Main Content */}
      <main className="page-container">
        {/* Hero Section */}
        <section className="relative py-16">
          <div className="absolute inset-0 -z-10 opacity-40 blur-3xl bg-gradient-to-r from-primary/40 via-purple-400/30 to-accent/40" />
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <h2 className="mt-4 text-5xl font-extrabold tracking-tight text-gray-900 dark:text-gray-100">
                Encontre o próximo evento que vai marcar seu ano
              </h2>
              <p className="mt-4 text-lg md:text-xl text-gray-600 dark:text-gray-300">
                Compre ingressos com Pix ou cartão, receba tudo no celular e
                valide na hora. Rápido, seguro e sem filas.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Button asChild>
                  <Link
                    to="/eventos"
                    onMouseEnter={prefetchEvents}
                    onFocus={prefetchEvents}
                  >
                    Explorar Eventos
                  </Link>
                </Button>
                <Button variant="secondary" asChild>
                  <Link to="/meus-ingressos">Meus Ingressos</Link>
                </Button>
              </div>
            </div>
            <div className="rounded-3xl border border-border/60 bg-card/80 p-6 shadow-lg backdrop-blur">
              <div>
                <p className="text-sm uppercase tracking-wide text-muted-foreground">
                  Próximo destaque
                </p>
                {isLoading && !highlightedEvent ? (
                  <Skeleton className="mt-3 h-7 w-3/4" />
                ) : (
                  <h3 className="mt-2 text-2xl font-bold text-foreground">
                    {highlightedEvent?.title ?? "Festival IngressosZ"}
                  </h3>
                )}
              </div>
              <div className="mt-6 grid gap-3 text-sm text-muted-foreground">
                <div className="flex items-center justify-between rounded-2xl bg-background px-4 py-3">
                  <span>Ingressos disponíveis</span>
                  <span className="font-semibold text-foreground">
                    {isLoading && !highlightedEvent ? (
                      <Skeleton className="h-5 w-10" />
                    ) : (
                      highlightedEvent?.availableTickets ?? 120
                    )}
                  </span>
                </div>
                <div className="flex items-center justify-between rounded-2xl bg-background px-4 py-3">
                  <span>Preço a partir de</span>
                  <span className="font-semibold text-foreground">
                    {isLoading && !highlightedEvent ? (
                      <Skeleton className="h-5 w-16" />
                    ) : (
                      `R$ ${highlightedEvent?.price ?? 80}`
                    )}
                  </span>
                </div>
              </div>
              <div className="mt-6">
                {isLoading && !highlightedEvent ? (
                  <Skeleton className="h-10 w-full" />
                ) : (
                  <Button asChild className="w-full">
                    <Link to="/eventos">Ver detalhes</Link>
                  </Button>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* Featured Events Section */}
        {showFeaturedSection && (
          <section className="mb-16">
            <div className="flex justify-between items-center mb-8">
              <h3 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                Eventos em Destaque
              </h3>
              <Button variant="ghost" asChild>
                <Link to="/eventos">Ver todos &rarr;</Link>
              </Button>
            </div>

            {isLoading ? (
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
                {[...Array(4)].map((_, i) => (
                  <EventCardSkeleton key={`featured-skeleton-${i}`} />
                ))}
              </div>
            ) : (
              <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-8">
                {featuredEvents.map((event: Event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mb-16">
          <div className="grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Eventos ativos</p>
              <div className="mt-2 text-3xl font-bold text-foreground">
                {isLoading && events.length === 0 ? (
                  <Skeleton className="h-9 w-20" />
                ) : (
                  events.length || 24
                )}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                Curadoria semanal com novidades.
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Ingressos vendidos</p>
              <p className="mt-2 text-3xl font-bold text-foreground">12k+</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pagamentos rápidos com Mercado Pago.
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">Validação em tempo real</p>
              <p className="mt-2 text-3xl font-bold text-foreground">99,9%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                QR Code criptografado na entrada.
              </p>
            </div>
          </div>
        </section>

        {/* Why Choose Us Section */}
        <section className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-gray-100 mb-12">
            Por que usar o IngressosZ?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-all duration-300">
              <h4 className="text-xl font-bold mb-2">Segurança Total</h4>
              <p className="text-muted-foreground">
                Pagamentos processados com a segurança do Mercado Pago e
                ingressos validados via QR Code criptografado.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-all duration-300">
              <h4 className="text-xl font-bold mb-2">Compra Rápida</h4>
              <p className="text-muted-foreground">
                Garanta seu ingresso em menos de 1 minuto. Sem filas, sem
                complicações e com confirmação imediata.
              </p>
            </div>

            <div className="text-center p-6 rounded-2xl bg-card border border-border/50 hover:shadow-lg transition-all duration-300">
              <h4 className="text-xl font-bold mb-2">100% Digital</h4>
              <p className="text-muted-foreground">
                Acesse seus ingressos pelo celular a qualquer momento. Esqueça
                impressões e papéis.
              </p>
            </div>
          </div>
        </section>

        {/* Admin/Validator Quick Access (Only for authorized roles) */}
        {(userProfile?.role === "organizer" ||
          userProfile?.role === "validator") && (
          <section className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Acesso Rápido
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {userProfile?.role === "organizer" && (
                <Link to="/admin" className="group">
                  <Card className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg bg-primary/5 border-primary/20">
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

              {(userProfile?.role === "organizer" ||
                userProfile?.role === "validator") && (
                <Link to="/validador" className="group">
                  <Card className="transition-all duration-300 group-hover:-translate-y-1 group-hover:shadow-lg bg-secondary/5 border-secondary/20">
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
