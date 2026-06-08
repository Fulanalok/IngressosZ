import { Helmet } from "@dr.pogodin/react-helmet";
import { Calendar, ChevronLeft, Clock, Info, MapPin } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import { ShareButtons, TicketPurchase } from "@/components/event";
import { EventDetailSkeleton } from "@/components/event/EventDetailSkeleton";
import { useAuth } from "@/hooks/auth/useAuth";
import { useEvent } from "@/hooks/event/useEvents";
import { formatDisplayDate } from "@/lib/date";

export function EventDetailPage() {
  const { eventId } = useParams<{ eventId: string }>();
  const navigate = useNavigate();
  const { user, loading: authLoading } = useAuth();
  const { data: event, status, error } = useEvent(eventId!);
  const [showPurchase, setShowPurchase] = useState(false);

  if (status === "pending" || authLoading) {
    return <EventDetailSkeleton />;
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center text-red-400">
        Erro ao carregar o evento: {error?.message}
      </div>
    );
  }

  if (!event) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
        <div className="max-w-md">
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center border border-border text-primary">
            <Info className="h-8 w-8" />
          </div>
          <h2 className="mb-4 text-3xl font-bold text-foreground">
            Evento não encontrado
          </h2>
          <p className="mb-8 text-muted-foreground">
            O evento que você está procurando não existe ou foi movido.
          </p>
          <button onClick={() => navigate("/")} className="btn-primary">
            Voltar para Home
          </button>
        </div>
      </div>
    );
  }

  const formattedDate = formatDisplayDate(event.date);
  const pageTitle = `${event.title} - IngressosZ`;
  const pageDescription = event.description.substring(0, 160);
  const pageUrl = window.location.href;
  const isLowStock = event.availableTickets > 0 && event.availableTickets <= 10;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta name="description" content={pageDescription} />
        <meta property="og:title" content={pageTitle} />
        <meta property="og:description" content={pageDescription} />
        <meta property="og:image" content={event.image} />
        <meta property="og:url" content={pageUrl} />
        <meta property="og:type" content="website" />
        <meta name="twitter:card" content="summary_large_image" />
      </Helmet>

      <div className="page-container max-w-6xl">
        <button
          onClick={() => navigate(-1)}
          className="mb-6 flex items-center text-sm font-bold text-primary hover:opacity-80"
        >
          <ChevronLeft className="mr-1 h-5 w-5" />
          Voltar
        </button>

        <div className="overflow-hidden border border-border bg-card">
          <div className="grid lg:grid-cols-[1.2fr_0.8fr]">
            <section>
              {event.image && (
                <div className="relative aspect-[16/9] overflow-hidden bg-muted">
                  <img
                    src={event.image}
                    alt={event.title}
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute left-5 top-5 border border-border bg-background/95 px-3 py-1 text-xs font-bold uppercase tracking-[0.1em] text-foreground">
                    {event.category}
                  </div>
                </div>
              )}

              <div className="p-6 md:p-8">
                <h1 className="mb-5 text-4xl font-bold leading-tight text-foreground md:text-5xl">
                  {event.title}
                </h1>

                <div className="mb-8 border-l-2 border-primary pl-5 text-base leading-8 text-muted-foreground">
                  {event.description}
                </div>

                <ShareButtons url={pageUrl} title={event.title} />
              </div>
            </section>

            <aside className="border-t border-border bg-background/40 p-6 md:p-8 lg:border-l lg:border-t-0">
              <div className="mb-6">
                <p className="text-xs font-bold uppercase tracking-[0.12em] text-muted-foreground">
                  Compra online
                </p>
                <p className="mt-2 text-3xl font-bold text-foreground">
                  R$ {(event.price || 0).toFixed(2)}
                </p>
                <p className="mt-1 text-sm text-muted-foreground">
                  Valor inicial por ingresso.
                </p>
              </div>

              <div className="grid gap-3">
                <InfoRow
                  icon={<Calendar className="h-5 w-5" />}
                  label="Data"
                  value={formattedDate}
                />
                <InfoRow
                  icon={<Clock className="h-5 w-5" />}
                  label="Horário"
                  value={event.time}
                />
                <InfoRow
                  icon={<MapPin className="h-5 w-5" />}
                  label="Local"
                  value={event.location}
                  href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                    event.address
                  )}`}
                />
                <InfoRow
                  icon={<span className="text-xs font-black">#</span>}
                  label="Disponibilidade"
                  value={`${event.availableTickets} ingressos disponíveis`}
                  danger={isLowStock}
                />
              </div>

              <div className="mt-6 border-t border-border pt-6">
                {event.availableTickets > 0 ? (
                  <button
                    onClick={() => setShowPurchase(true)}
                    className="btn-primary w-full py-4 text-base"
                  >
                    Comprar ingresso
                  </button>
                ) : (
                  <div className="border border-red-900/50 bg-red-950/30 p-6 text-center">
                    <p className="mb-1 text-xl font-bold text-red-300">
                      Ingressos esgotados
                    </p>
                    <p className="text-sm text-red-200">
                      Fique atento para novas edições deste evento.
                    </p>
                  </div>
                )}
              </div>
            </aside>
          </div>
        </div>

        {showPurchase && (
          <TicketPurchase
            event={event}
            user={user}
            onClose={() => setShowPurchase(false)}
          />
        )}
      </div>
    </>
  );
}

interface InfoRowProps {
  icon: ReactNode;
  label: string;
  value: string;
  href?: string;
  danger?: boolean;
}

function InfoRow({ icon, label, value, href, danger = false }: InfoRowProps) {
  const valueClass = danger ? "text-red-300" : "text-foreground";
  const content = href ? (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`font-bold transition-colors hover:text-primary ${valueClass}`}
    >
      {value}
    </a>
  ) : (
    <p className={`font-bold ${valueClass}`}>{value}</p>
  );

  return (
    <div className="flex items-center border border-border bg-card p-4">
      <div
        className={`mr-4 flex h-10 w-10 items-center justify-center border border-border ${
          danger ? "text-red-300" : "text-primary"
        }`}
      >
        {icon}
      </div>
      <div>
        <p className="text-xs font-bold uppercase tracking-[0.08em] text-muted-foreground">
          {label}
        </p>
        {content}
      </div>
    </div>
  );
}

export default EventDetailPage;
