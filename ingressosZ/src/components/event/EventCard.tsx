import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { eventService } from "@/services/firestore";
import type { Event } from "@/types";

interface EventCardProps {
  event: Event;
}

function EventCard({ event }: EventCardProps) {
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const imagePrefetchedRef = useRef(false);

  const prefetchDetails = useCallback(() => {
    queryClient.prefetchQuery({
      queryKey: ["event", event.id],
      queryFn: () => eventService.getEventById(event.id),
    });
    import("@/pages/event/EventDetailPage").catch(() => void 0);
    if (!imagePrefetchedRef.current && event.image) {
      imagePrefetchedRef.current = true;
      const img = new Image();
      img.src = event.image;
    }
  }, [queryClient, event.id, event.image]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;

    let didPrefetch = false;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !didPrefetch) {
            didPrefetch = true;
            prefetchDetails();
            observer.disconnect();
            break;
          }
        }
      },
      { rootMargin: "100px" }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [prefetchDetails]);

  const formattedDate = useMemo(() => {
    const date = new Date(event.date);
    return date.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }, [event.date]);

  const formattedTime = useMemo(() => {
    return event.time ? event.time.slice(0, 5) : "--:--";
  }, [event.time]);

  const availableTickets = Number(event.availableTickets ?? 0);
  const maxTickets = Math.max(Number(event.maxTickets ?? availableTickets), 1);
  const soldPercent = Math.min(
    100,
    Math.max(0, ((maxTickets - availableTickets) / maxTickets) * 100)
  );
  const isSoldOut = availableTickets === 0;
  const isLastCall = availableTickets > 0 && availableTickets <= 10;

  return (
    <div
      ref={rootRef}
      className="group flex h-full flex-col overflow-hidden rounded-lg border border-border bg-card shadow-sm transition-all hover:border-primary/50 hover:shadow-md"
      onMouseEnter={prefetchDetails}
      onFocus={prefetchDetails}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-muted">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-[linear-gradient(135deg,hsl(var(--primary)/0.16),hsl(var(--accent)/0.14),hsl(var(--secondary)/0.55))]">
            <Ticket className="h-12 w-12 text-primary/70" />
          </div>
        )}

        <div className="absolute left-3 top-3">
          <span className="rounded-md bg-background/90 px-2.5 py-1 text-xs font-bold text-foreground shadow-sm backdrop-blur">
            {event.category}
          </span>
        </div>

        {(isLastCall || isSoldOut) && (
          <div className="absolute right-3 top-3">
            <span
              className={`rounded-md px-2.5 py-1 text-xs font-bold shadow-sm ${
                isSoldOut
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary text-secondary-foreground"
              }`}
            >
              {isSoldOut ? "Sem ingressos" : "Últimos ingressos!"}
            </span>
          </div>
        )}
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 text-lg font-black leading-snug text-foreground transition-colors group-hover:text-primary">
          {event.title}
        </h3>

        <div className="mt-4 grid gap-2 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <CalendarDays className="h-4 w-4 text-primary" />
            <span>{formattedDate}</span>
            <Clock className="ml-2 h-4 w-4 text-primary" />
            <span>{formattedTime}</span>
          </div>
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0 text-accent" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        <div className="mt-5 flex items-end justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-muted-foreground">
              A partir de
            </p>
            <p className="text-2xl font-black text-foreground">
              R$ {(event.pricing?.standard ?? event.price ?? 0).toFixed(2)}
            </p>
          </div>
          <p
            className={`text-right text-xs font-bold ${
              isLastCall ? "text-secondary-foreground" : "text-muted-foreground"
            }`}
          >
            {availableTickets} disponíveis
          </p>
        </div>

        <div className="mt-4 h-2 overflow-hidden rounded-full bg-muted">
          <div
            className="h-full rounded-full bg-accent transition-all duration-700"
            style={{ width: `${soldPercent}%` }}
          />
        </div>

        <Button asChild className="mt-5 w-full" disabled={isSoldOut}>
          <Link
            to={`/evento/${event.id}`}
            onMouseEnter={prefetchDetails}
            onFocus={prefetchDetails}
          >
            {isSoldOut ? "Esgotado" : "Ver Detalhes & Comprar"}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default memo(EventCard);
