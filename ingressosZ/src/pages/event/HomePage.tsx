import { useQueryClient } from "@tanstack/react-query";
import {
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  ShieldCheck,
  Smartphone,
  TicketCheck,
  Zap,
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
        <section className="grid gap-10 py-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-center lg:py-16">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 text-sm font-semibold text-muted-foreground shadow-sm">
              <TicketCheck className="h-4 w-4 text-accent" />
              Compra digital, QR Code e validação na entrada
            </div>

            <h1 className="mt-6 max-w-3xl text-4xl font-black leading-tight tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Eventos organizados para quem compra, vende e valida ingressos.
            </h1>

            <p className="mt-5 max-w-xl text-base leading-8 text-muted-foreground sm:text-lg">
              Pix, cartão, tickets digitais e controle de portaria em um fluxo
              simples para lançar eventos pequenos com mais segurança.
            </p>

            <div className="mt-7 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link
                  to="/eventos"
                  onMouseEnter={prefetchEvents}
                  onFocus={prefetchEvents}
                >
                  Explorar eventos
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild size="lg">
                <Link to="/meus-ingressos">Meus ingressos</Link>
              </Button>
            </div>

            <dl className="mt-10 grid max-w-xl grid-cols-3 gap-3">
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <dt className="text-xs font-semibold text-muted-foreground">
                  Eventos
                </dt>
                <dd className="mt-1 text-2xl font-black text-foreground">
                  {isLoading && events.length === 0 ? (
                    <Skeleton className="h-8 w-14" />
                  ) : (
                    events.length || 24
                  )}
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <dt className="text-xs font-semibold text-muted-foreground">
                  Pix/cartão
                </dt>
                <dd className="mt-1 text-2xl font-black text-foreground">
                  MP
                </dd>
              </div>
              <div className="rounded-lg border border-border bg-card p-4 shadow-sm">
                <dt className="text-xs font-semibold text-muted-foreground">
                  QR Code
                </dt>
                <dd className="mt-1 text-2xl font-black text-foreground">
                  JWT
                </dd>
              </div>
            </dl>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card shadow-xl">
            <div className="relative aspect-[4/3] bg-muted">
              {highlightedEvent?.image ? (
                <img
                  src={highlightedEvent.image}
                  alt={highlightedEvent.title}
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="flex h-full items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.18),hsl(var(--accent)/0.18),hsl(var(--secondary)/0.55))]">
                  <TicketCheck className="h-20 w-20 text-primary/70" />
                </div>
              )}
              <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent p-5 text-white">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-white/70">
                  Próximo destaque
                </p>
                {isLoading && !highlightedEvent ? (
                  <Skeleton className="mt-2 h-7 w-3/4 bg-white/30" />
                ) : (
                  <h2 className="mt-2 text-2xl font-black">
                    {highlightedEvent?.title ?? "Festival IngressosZ"}
                  </h2>
                )}
              </div>
            </div>

            <div className="grid gap-0 border-t border-border bg-card sm:grid-cols-3">
              <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
                <CalendarDays className="mb-3 h-5 w-5 text-primary" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Data
                </p>
                <p className="mt-1 font-bold text-foreground">
                  {highlightedEvent?.date ?? "Em breve"}
                </p>
              </div>
              <div className="border-b border-border p-4 sm:border-b-0 sm:border-r">
                <MapPin className="mb-3 h-5 w-5 text-accent" />
                <p className="text-xs font-semibold text-muted-foreground">
                  Local
                </p>
                <p className="mt-1 truncate font-bold text-foreground">
                  {highlightedEvent?.location ?? "Brasil"}
                </p>
              </div>
              <div className="p-4">
                <Zap className="mb-3 h-5 w-5 text-secondary-foreground" />
                <p className="text-xs font-semibold text-muted-foreground">
                  A partir de
                </p>
                <p className="mt-1 font-bold text-foreground">
                  R$ {highlightedEvent?.price ?? 80}
                </p>
              </div>
            </div>
          </div>
        </section>

        {showFeaturedSection && (
          <section className="mb-20">
            <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-sm font-bold uppercase tracking-[0.18em] text-accent">
                  curadoria
                </p>
                <h2 className="mt-2 text-3xl font-black text-foreground">
                  Eventos em Destaque
                </h2>
                <p className="mt-2 text-muted-foreground">
                  Experiências prontas para compra digital e entrada com QR.
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
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <EventCardSkeleton key={`featured-skeleton-${i}`} />
                ))}
              </div>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {featuredEvents.map((event: Event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mb-24 border-y border-border py-14">
          <div className="mx-auto mb-10 max-w-2xl text-center">
            <h2 className="text-3xl font-black text-foreground">
              Por que IngressosZ?
            </h2>
            <p className="mt-3 text-muted-foreground">
              O essencial para vender, acompanhar e validar sem inflar a
              operação.
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <ShieldCheck className="h-8 w-8 text-primary" />
              <h3 className="mt-5 text-xl font-black">Segurança Total</h3>
              <p className="mt-3 leading-7 text-muted-foreground">
                Pagamentos via Mercado Pago, App Check e QR Code com assinatura
                para reduzir fraude e reuso.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <Zap className="h-8 w-8 text-accent" />
              <h3 className="mt-5 text-xl font-black">Compra rápida</h3>
              <p className="mt-3 leading-7 text-muted-foreground">
                Checkout e Pix com sessão de pagamento rastreável do carrinho
                até a emissão do ingresso.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-6 shadow-sm">
              <Smartphone className="h-8 w-8 text-secondary-foreground" />
              <h3 className="mt-5 text-xl font-black">Portaria simples</h3>
              <p className="mt-3 leading-7 text-muted-foreground">
                Validação no navegador para equipes com role de validador,
                organizador ou admin.
              </p>
            </div>
          </div>
        </section>

        {canValidate && (
          <section className="mb-12">
            <h2 className="mb-6 text-2xl font-black text-foreground">
              Acesso rápido
            </h2>
            <div className="grid gap-5 md:grid-cols-2">
              {isOrganizer && (
                <Link to="/admin" className="group">
                  <Card className="transition-all group-hover:border-primary group-hover:shadow-md">
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
                  <Card className="transition-all group-hover:border-primary group-hover:shadow-md">
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
