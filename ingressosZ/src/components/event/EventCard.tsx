import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/date";
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

  const formattedDate = useMemo(() => formatDisplayDate(event.date), [event.date]);
  const formattedTime = useMemo(
    () => (event.time ? event.time.slice(0, 5) : "--:--"),
    [event.time]
  );
  const availableTickets = Number(event.availableTickets ?? 0);
  const isSoldOut = availableTickets === 0;

  return (
    <article
      ref={rootRef}
      className="group flex h-full min-w-0 flex-col overflow-hidden border border-border bg-card"
      onMouseEnter={prefetchDetails}
      onFocus={prefetchDetails}
    >
      <div className="relative aspect-[16/9] overflow-hidden bg-muted">
        {event.image ? (
          <img
            src={event.image}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-background">
            <Ticket className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <span className="absolute left-3 top-3 border border-border bg-background px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
          {event.category}
        </span>
      </div>

      <div className="flex flex-1 flex-col p-5">
        <h3 className="line-clamp-2 min-h-[3.25rem] text-xl font-bold leading-tight text-foreground">
          {event.title}
        </h3>

        <div className="mt-4 space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
          <p className="flex flex-wrap items-center gap-2">
            <CalendarDays className="h-4 w-4" />
            <span>{formattedDate}</span>
            <Clock className="ml-2 h-4 w-4" />
            <span>{formattedTime}</span>
          </p>
          <p className="flex items-center gap-2">
            <MapPin className="h-4 w-4 shrink-0" />
            <span className="truncate">{event.location}</span>
          </p>
        </div>

        <div className="mt-5 flex items-end justify-between gap-4 border-t border-border pt-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
              A partir de
            </p>
            <p className="text-2xl font-bold text-foreground">
              R$ {(event.pricing?.standard ?? event.price ?? 0).toFixed(2)}
            </p>
          </div>
          <p className="text-right text-xs font-semibold text-muted-foreground">
            {isSoldOut ? "Esgotado" : `${availableTickets} disponíveis`}
          </p>
        </div>

        <Button asChild className="mt-5 w-full" disabled={isSoldOut}>
          <Link
            to={`/evento/${event.id}`}
            onMouseEnter={prefetchDetails}
            onFocus={prefetchDetails}
          >
            {isSoldOut ? "Esgotado" : "Ver detalhes"}
          </Link>
        </Button>
      </div>
    </article>
  );
}

export default memo(EventCard);
