import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { eventService } from "../services/firestore";
import type { Event } from "../types";

const EVENTS_PER_PAGE = 8;

export function useEvents() {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery<
    Awaited<ReturnType<typeof eventService.getEvents>>,
    Error
  >({
    queryKey: ["events"],
    queryFn: ({ pageParam }) =>
      eventService.getEvents(EVENTS_PER_PAGE, pageParam as any),
    getNextPageParam: (lastPage: any) => {
      // Se a última página não tiver o número máximo de eventos, não há próxima página
      if (lastPage.events.length < EVENTS_PER_PAGE) return undefined;
      return lastPage.lastVisible;
    },
    initialPageParam: undefined,
    staleTime: 5 * 60 * 1000, // 5 minutos
  });

  // "Achata" os eventos de todas as páginas em um único array
  const events = data?.pages.flatMap((page: any) => page.events) || [];

  return {
    events,
    loading: isLoading,
    error: error ? error.message : null,
    hasNextPage,
    isFetchingNextPage,
    fetchNextPage,
  };
}

export function useEvent(eventId: string) {
  const { data, isLoading, error } = useQuery<Event | null, Error>({
    queryKey: ["event", eventId],
    queryFn: () => eventService.getEventById(eventId),
    enabled: Boolean(eventId),
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return {
    event: data || null,
    loading: isLoading,
    error: error ? error.message : null,
  };
}
