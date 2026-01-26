import { useQueryClient } from "@tanstack/react-query";
import { memo, useCallback, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { Button } from "../components/ui/button";
import { eventService } from "../services/firestore";
import type { Event } from "../types";

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
    import("../pages/EventDetailPage").catch(() => void 0);
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
    return event.time.slice(0, 5);
  }, [event.time]);

  const getCategoryColor = (category: string) => {
    const colors: { [key: string]: string } = {
      Música:
        "bg-purple-100 dark:bg-purple-900/50 text-purple-800 dark:text-purple-200",
      Gastronomia:
        "bg-orange-100 dark:bg-orange-900/50 text-orange-800 dark:text-orange-200",
      Tecnologia:
        "bg-blue-100 dark:bg-blue-900/50 text-blue-800 dark:text-blue-200",
      Entretenimento:
        "bg-pink-100 dark:bg-pink-900/50 text-pink-800 dark:text-pink-200",
      Educação:
        "bg-green-100 dark:bg-green-900/50 text-green-800 dark:text-green-200",
      Esporte: "bg-red-100 dark:bg-red-900/50 text-red-800 dark:text-red-200",
    };
    return (
      colors[category] ||
      "bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200"
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
        <div className="relative mb-4 overflow-hidden rounded-none">
          <img
            src={event.image}
            alt={event.title}
            loading="lazy"
            decoding="async"
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div className="absolute top-3 left-3">
            <span
              className={`px-2 py-1 text-xs font-medium rounded-none ${getCategoryColor(
                event.category
              )}`}
            >
              {event.category}
            </span>
          </div>
          {event.availableTickets <= 10 && event.availableTickets > 0 && (
            <div className="absolute top-3 right-3">
              <span className="bg-red-500 text-white px-2 py-1 text-xs font-medium rounded-none">
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
            <span className="mr-2">📅</span>
            <span className="font-medium">Data:</span>
            <span className="ml-1">{formattedDate}</span>
          </div>

          <div className="flex items-center">
            <span className="mr-2">🕐</span>
            <span className="font-medium">Horário:</span>
            <span className="ml-1">{formattedTime}</span>
          </div>

          <div className="flex items-center">
            <span className="mr-2">📍</span>
            <span className="font-medium">Local:</span>
            <span className="ml-1 truncate">{event.location}</span>
          </div>
        </div>

        {/* Price */}
        <div className="flex items-center justify-between">
          <div className="flex items-center text-primary">
            <span className="mr-2 text-lg">💰</span>
            <span className="text-xl font-bold">
              R${" "}
              {(
                event.pricing?.standard ??
                event.price ??
                0
              ).toFixed(2)}
            </span>
          </div>
          <div
            className={`text-xs font-medium ${
              event.availableTickets > 10
                ? "text-gray-500 dark:text-gray-400"
                : "text-red-600 dark:text-red-400"
            }`}
          >
            🎫 {event.availableTickets} disponíveis
          </div>
        </div>

        {/* Progress Bar */}
        <div className="w-full bg-muted rounded-none h-1.5">
          <div
            className="bg-gradient-to-r from-primary to-accent h-1.5 rounded-none transition-all duration-300"
            style={{
              width: `${
                ((event.maxTickets - event.availableTickets) /
                  event.maxTickets) *
                100
              }%`,
            }}
          ></div>
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
                <span className="mr-2">🛒</span>
                Ver Detalhes & Comprar
              </span>
            ) : (
              <span className="flex items-center justify-center">
                <span className="mr-2">❌</span>
                Esgotado
              </span>
            )}
          </Link>
        </Button>
      </div>
    </div>
  );
}

export default memo(EventCard);
