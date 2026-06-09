import { useQueryClient } from "@tanstack/react-query";
import {
  type DocumentData,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { ArrowRight, TicketCheck } from "lucide-react";
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
        <section className="border-b border-border py-12 lg:py-16">
          <div className="max-w-3xl">
            <p className="mb-4 inline-flex items-center gap-2 border border-border bg-card px-3 py-2 text-sm font-medium text-muted-foreground">
              <TicketCheck className="h-4 w-4 text-primary" />
              IngressosZ
            </p>
            <h1 className="text-4xl font-bold leading-tight text-foreground sm:text-5xl lg:text-6xl">
              Eventos, ingressos e QR Code em um fluxo simples
            </h1>
            <p className="mt-5 max-w-2xl text-base leading-8 text-muted-foreground sm:text-lg">
              Compre ingressos digitais e acesse seus tickets em poucos passos.
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
                variant="outline"
                className="h-12 px-6"
              >
                <Link to="/meus-ingressos">Meus ingressos</Link>
              </Button>
            </div>
          </div>
        </section>

        {showFeaturedSection && (
          <section className="py-10">
            <div className="mb-6 flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
              <h2 className="text-2xl font-bold text-foreground">
                Próximos eventos
              </h2>
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
