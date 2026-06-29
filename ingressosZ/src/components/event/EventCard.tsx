import { useQueryClient } from "@tanstack/react-query";
import { CalendarDays, Clock, MapPin, Ticket } from "lucide-react";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { Button } from "@/components/ui/button";
import { formatDisplayDate } from "@/lib/date";
import { eventService } from "@/services/firestore";
import type { Event } from "@/types";

interface EventCardProps {
  event: Event;
}

const DEFAULT_FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1511795409834-ef04bbd61622?w=900&h=506&fit=crop&auto=format&q=80";

const FALLBACK_IMAGES = [
  {
    terms: ["foto", "educa"],
    url: "https://images.unsplash.com/photo-1507236390809-947de8aea269?w=900&h=506&fit=crop&auto=format&q=80",
  },
  {
    terms: ["tech", "tecnologia"],
    url: "https://images.unsplash.com/photo-1700936655679-83f4b37d7d74?w=900&h=506&fit=crop&auto=format&q=80",
  },
  {
    terms: ["gastronomia", "food"],
    url: "https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=900&h=506&fit=crop&auto=format&q=80",
  },
  {
    terms: ["show", "mus", "jazz"],
    url: "https://images.unsplash.com/photo-1516280440614-37939bbacd81?w=900&h=506&fit=crop&auto=format&q=80",
  },
  {
    terms: ["entreten", "comedy", "stand"],
    url: "https://images.unsplash.com/photo-1580188928585-0ef5c1a5c4dd?w=900&h=506&fit=crop&auto=format&q=80",
  },
];

function getFallbackImage(category: string) {
  const normalizedCategory = category.toLowerCase();
  return (
    FALLBACK_IMAGES.find(({ terms }) =>
      terms.some((term) => normalizedCategory.includes(term))
    )?.url ?? DEFAULT_FALLBACK_IMAGE
  );
}

interface EventCardImageProps {
  event: Event;
  imageLoadFailed: boolean;
  fallbackImageFailed: boolean;
  remoteImageLoaded: boolean;
  onFallbackImageError: () => void;
  onRemoteImageLoad: () => void;
  onRemoteImageError: () => void;
}

function EventCardImage({
  event,
  imageLoadFailed,
  fallbackImageFailed,
  remoteImageLoaded,
  onFallbackImageError,
  onRemoteImageLoad,
  onRemoteImageError,
}: EventCardImageProps) {
  const fallbackImage = getFallbackImage(event.category);
  const shouldLoadRemoteImage = Boolean(event.image && !imageLoadFailed);

  return (
    <div className="relative aspect-[16/9] overflow-hidden bg-muted">
      {!fallbackImageFailed ? (
        <img
          src={fallbackImage}
          alt={remoteImageLoaded ? "" : event.title}
          loading="eager"
          decoding="sync"
          className="h-full w-full object-cover"
          onError={onFallbackImageError}
        />
      ) : (
        <div className="flex h-full w-full items-center justify-center bg-secondary">
          <Ticket className="h-12 w-12 text-primary" aria-hidden="true" />
        </div>
      )}
      {shouldLoadRemoteImage ? (
        <img
          src={event.image}
          alt={remoteImageLoaded ? event.title : ""}
          loading="lazy"
          decoding="async"
          className={`absolute inset-0 h-full w-full object-cover ${
            remoteImageLoaded ? "opacity-100" : "opacity-0"
          }`}
          onLoad={onRemoteImageLoad}
          onError={onRemoteImageError}
        />
      ) : null}
      <span className="absolute left-3 top-3 border border-border bg-background px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.08em] text-foreground">
        {event.category}
      </span>
    </div>
  );
}

function EventCard({ event }: EventCardProps) {
  const queryClient = useQueryClient();
  const rootRef = useRef<HTMLDivElement | null>(null);
  const imagePrefetchedRef = useRef(false);
  const [imageLoadFailed, setImageLoadFailed] = useState(false);
  const [fallbackImageFailed, setFallbackImageFailed] = useState(false);
  const [remoteImageLoaded, setRemoteImageLoaded] = useState(false);

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

  useEffect(() => {
    setImageLoadFailed(false);
    setFallbackImageFailed(false);
    setRemoteImageLoaded(false);
  }, [event.id, event.image]);

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
      <EventCardImage
        event={event}
        imageLoadFailed={imageLoadFailed}
        fallbackImageFailed={fallbackImageFailed}
        remoteImageLoaded={remoteImageLoaded}
        onFallbackImageError={() => setFallbackImageFailed(true)}
        onRemoteImageLoad={() => setRemoteImageLoaded(true)}
        onRemoteImageError={() => setImageLoadFailed(true)}
      />

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
