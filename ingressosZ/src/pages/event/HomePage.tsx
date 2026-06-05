import { useQueryClient } from "@tanstack/react-query";
import {
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  ArrowRight,
  CalendarDays,
  MapPin,
  QrCode,
  Search,
  ShieldCheck,
  Smartphone,
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
      <main className="page-container">
        <section className="grid gap-8 py-8 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:py-12">
          <div className="max-w-xl">
            <div className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground">
              <TicketCheck className="h-4 w-4 text-primary" />
              Ingressos, pagamento e portaria
            </div>

            <h1 className="mt-5 max-w-2xl text-3xl font-bold leading-tight text-foreground sm:text-4xl lg:text-5xl">
              Encontre eventos e compre seu ingresso com QR Code.
            </h1>

            <div className="mt-6 rounded-lg border border-border bg-card p-3">
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="flex min-h-11 flex-1 items-center gap-2 rounded-md border border-input bg-background px-3 text-muted-foreground">
                  <Search className="h-4 w-4" />
                  <span className="truncate text-sm">
                    Buscar por evento, cidade ou categoria
                  </span>
                </div>
                <Button asChild>
                  <Link
                    to="/eventos"
                    onMouseEnter={prefetchEvents}
                    onFocus={prefetchEvents}
                  >
                    Ver eventos
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Link>
                </Button>
              </div>
            </div>

            <dl className="mt-6 grid max-w-xl grid-cols-3 gap-2">
              <div className="rounded-md border border-border bg-card p-3">
                <dt className="text-xs font-medium text-muted-foreground">
                  Disponíveis
                </dt>
                <dd className="mt-1 text-xl font-bold text-foreground">
                  {isLoading && events.length === 0 ? (
                    <Skeleton className="h-7 w-12" />
                  ) : (
                    events.length || 24
                  )}
                </dd>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <dt className="text-xs font-medium text-muted-foreground">
                  Pagamento
                </dt>
                <dd className="mt-1 text-xl font-bold text-foreground">MP</dd>
              </div>
              <div className="rounded-md border border-border bg-card p-3">
                <dt className="text-xs font-medium text-muted-foreground">
                  QR Code
                </dt>
                <dd className="mt-1 text-xl font-bold text-foreground">JWT</dd>
              </div>
            </dl>
          </div>

          <div className="overflow-hidden rounded-lg border border-border bg-card">
            <div className="border-b border-border px-5 py-4">
              <p className="text-sm font-semibold text-foreground">
                Próximo evento em destaque
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                Informações principais antes da compra
              </p>
            </div>

            <div className="relative aspect-[16/9] bg-muted">
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
              <div className="absolute inset-x-0 bottom-0 bg-black/85 p-5 text-white">
                {isLoading && !highlightedEvent ? (
                  <Skeleton className="h-7 w-3/4 bg-white/30" />
                ) : (
                  <h2 className="text-2xl font-bold">
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
                  {highlightedEvent?.date ?? "Em breve"}
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
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {[...Array(4)].map((_, i) => (
                  <EventCardSkeleton key={`featured-skeleton-${i}`} />
                ))}
              </div>
            ) : (
              <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-4">
                {featuredEvents.map((event: Event) => (
                  <EventCard key={event.id} event={event} />
                ))}
              </div>
            )}
          </section>
        )}

        <section className="mb-24 border-y border-border py-10">
          <div className="mb-8 max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground">
              Por que IngressosZ?
            </h2>
            <p className="mt-3 text-muted-foreground">
              O essencial para vender, acompanhar e validar ingressos.
            </p>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="rounded-lg border border-border bg-card p-5">
              <ShieldCheck className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-bold">Segurança Total</h3>
              <p className="mt-2 leading-7 text-muted-foreground">
                Pagamentos via Mercado Pago, App Check e QR Code com assinatura
                para reduzir fraude e reuso.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <QrCode className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-bold">Compra rápida</h3>
              <p className="mt-2 leading-7 text-muted-foreground">
                Checkout e Pix com sessão de pagamento rastreável do carrinho
                até a emissão do ingresso.
              </p>
            </div>

            <div className="rounded-lg border border-border bg-card p-5">
              <Smartphone className="h-6 w-6 text-primary" />
              <h3 className="mt-4 text-lg font-bold">Portaria simples</h3>
              <p className="mt-2 leading-7 text-muted-foreground">
                Validação no navegador para equipes com role de validador,
                organizador ou admin.
              </p>
            </div>
          </div>
        </section>

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
