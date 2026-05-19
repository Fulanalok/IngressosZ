import { useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router";
import { Button } from '@/components/ui/button';
import { eventService } from '@/services/firestore';
import type { Event } from '@/types';

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
    // Pré-carregar também o chunk da página de detalhes
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

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Música: "bg-blue-100 dark:bg-blue-900/40 text-blue-800 dark:text-blue-300",
      Gastronomia: "bg-blue-200 dark:bg-blue-800/40 text-blue-900 dark:text-blue-200",
      Tecnologia: "bg-primary/20 text-primary dark:text-blue-300",
      Entretenimento: "bg-sky-100 dark:bg-sky-900/40 text-sky-800 dark:text-sky-300",
      Educação: "bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-400",
      Esporte: "bg-ocean/20 text-ocean dark:text-blue-300",
    };
    return (
      colors[category] ||
      "bg-secondary text-secondary-foreground"
    );
  };

  return (
    <div
      ref={rootRef}
      className="group card hover:shadow-large transition-all duration-300 hover:-translate-y-1 max-w-sm bg-background"
      onMouseEnter={prefetchDetails}
      onFocus={prefetchDetails}
    >
      {/* Image */}
      {event.image && (
        <div className="relative mb-4 overflow-hidden rounded-2xl">
          <img
            src={event.image}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="w-full h-52 object-cover transition-transform duration-500 group-hover:scale-110"
          />
          <div className="absolute top-3 left-3">
            <span
              className={`px-3 py-1 text-xs font-bold rounded-lg backdrop-blur-md shadow-sm ${getCategoryColor(
                event.category
              )}`}
            >
              {event.category}
            </span>
          </div>
          {event.availableTickets <= 10 && event.availableTickets > 0 && (
            <div className="absolute top-3 right-3">
              <span className="bg-red-500 text-white px-3 py-1 text-xs font-bold rounded-lg shadow-lg">
                Últimos ingressos!
              </span>
            </div>
          )}
        </div>
      )}

      {/* Content */}
      <div className="space-y-3">
        <h3 className="text-lg font-semibold text-foreground line-clamp-2 group-hover:text-primary transition-colors">
          {event.title}
        </h3>

        {/* Event Details */}
        <div className="space-y-2 text-sm text-muted-foreground">
          <div className="flex items-center">
            <span className="font-medium">Data:</span>
            <span className="ml-1">{formattedDate}</span>
          </div>

          <div className="flex items-center">
            <span className="font-medium">Horário:</span>
            <span className="ml-1">{formattedTime}</span>
          </div>

          <div className="flex items-center">
            <span className="font-medium">Local:</span>
            <span className="ml-1 truncate">{event.location}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <span className="text-2xl font-extrabold blue-gradient-text">
              R$ {(event.pricing?.standard ?? event.price ?? 0).toFixed(2)}
            </span>
          </div>
          <div
            className={`text-xs font-medium transition-all duration-500 ${
              event.availableTickets > 10
                ? "text-gray-500 dark:text-gray-400"
                : "text-red-600 dark:text-red-400 font-bold animate-pulse"
            }`}
          >
            {event.availableTickets} disponíveis
          </div>
        </div>

        {/* Progress Bar */}
        <div className="group/progress w-full bg-secondary rounded-full h-2 overflow-hidden shadow-inner">
          <div
            className="bg-gradient-to-r from-primary to-accent h-full rounded-full transition-all duration-700 ease-out relative"
            style={{
              width: `${
                ((event.maxTickets - event.availableTickets) /
                  event.maxTickets) *
                100
              }%`,
            }}
          >
            <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
          </div>
        </div>

        {/* Action Button */}
        <Button
          asChild
          className="w-full"
          disabled={event.availableTickets === 0}
        >
          <Link
            to={`/evento/${event.id}`}
            className="block"
            onMouseEnter={prefetchDetails}
            onFocus={prefetchDetails}
          >
            {event.availableTickets > 0 ? (
              <span className="flex items-center justify-center">
                Ver Detalhes & Comprar
              </span>
            ) : (
              <span className="flex items-center justify-center">Esgotado</span>
            )}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default memo(EventCard);
