import { useQueryClient } from "@tanstack/react-query";
import {
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { ArrowRight, ShieldCheck, Smartphone, Zap } from "lucide-react";
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
    <div className="min-h-screen gradient-bg">
      <main className="page-container">
        <section className="relative py-16">
          <div className="absolute inset-0 -z-10 opacity-40 blur-3xl bg-gradient-to-r from-primary/40 via-purple-400/30 to-accent/40" />
          <div className="grid gap-10 lg:grid-cols-[1.2fr_0.8fr] items-center">
            <div>
              <h2 className="mt-4 text-6xl font-extrabold tracking-tighter leading-tight text-foreground">
                Sua próxima{" "}
                <span className="blue-gradient-text">experiência</span>{" "}
                começa aqui
              </h2>
              <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-xl leading-relaxed">
                Compre ingressos com Pix ou cartão em segundos. Receba tudo
                no celular e entre sem filas. Seguro, rápido e 100% digital.
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

            <div className="glass-card p-8 border-primary/10 relative overflow-hidden group">
              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/10 rounded-full -mr-16 -mt-16 blur-2xl group-hover:bg-primary/20 transition-all" />
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

        {showFeaturedSection && (
          <section className="mb-20">
            <div className="flex justify-between items-end mb-10">
              <div>
                <h3 className="text-3xl font-extrabold text-foreground mb-2">
                  Eventos em Destaque
                </h3>
                <p className="text-muted-foreground">
                  Os eventos mais aguardados da temporada.
                </p>
              </div>
              <Button
                variant="ghost"
                asChild
                className="group text-primary hover:text-primary font-bold"
              >
                <Link to="/eventos">
                  Ver todos{" "}
                  <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                </Link>
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
              <p className="text-sm text-muted-foreground">
                Ingressos vendidos
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">12k+</p>
              <p className="mt-2 text-sm text-muted-foreground">
                Pagamentos rápidos com Mercado Pago.
              </p>
            </div>
            <div className="rounded-2xl border border-border/50 bg-card p-6 shadow-sm">
              <p className="text-sm text-muted-foreground">
                Validação em tempo real
              </p>
              <p className="mt-2 text-3xl font-bold text-foreground">99,9%</p>
              <p className="mt-2 text-sm text-muted-foreground">
                QR Code criptografado na entrada.
              </p>
            </div>
          </div>
        </section>

        <section className="mb-24 py-12">
          <div className="text-center max-w-2xl mx-auto mb-16">
            <h3 className="text-4xl font-extrabold text-foreground mb-4">
              Por que IngressosZ?
            </h3>
            <p className="text-muted-foreground text-lg">
              A tecnologia que você precisa com a simplicidade que você merece.
            </p>
          </div>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="group text-center p-8 rounded-3xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-2xl transition-all duration-300">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <ShieldCheck className="h-8 w-8" />
              </div>
              <h4 className="text-xl font-bold mb-3">Segurança Total</h4>
              <p className="text-muted-foreground leading-relaxed">
                Pagamentos criptografados via Mercado Pago e ingressos
                validados com assinatura digital.
              </p>
            </div>

            <div className="group text-center p-8 rounded-3xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-2xl transition-all duration-300">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <Zap className="h-8 w-8" />
              </div>
              <h4 className="text-xl font-bold mb-3">Compra Instantânea</h4>
              <p className="text-muted-foreground leading-relaxed">
                Garanta sua presença em segundos com Pix. Aprovação em tempo
                real e sem burocracia.
              </p>
            </div>

            <div className="group text-center p-8 rounded-3xl bg-card border border-border/40 hover:border-primary/30 hover:shadow-2xl transition-all duration-300">
              <div className="mx-auto w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-6 text-primary group-hover:scale-110 transition-transform">
                <Smartphone className="h-8 w-8" />
              </div>
              <h4 className="text-xl font-bold mb-3">Sempre à Mão</h4>
              <p className="text-muted-foreground leading-relaxed">
                Acesse seu QR Code direto no navegador, sem precisar instalar
                nada. Funciona offline na entrada.
              </p>
            </div>
          </div>
        </section>

        {canValidate && (
          <section className="mb-12">
            <h3 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">
              Acesso Rápido
            </h3>
            <div className="grid md:grid-cols-2 gap-6">
              {isOrganizer && (
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

              {canValidate && (
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
