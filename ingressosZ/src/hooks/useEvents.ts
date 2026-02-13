import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { DocumentData, QueryDocumentSnapshot } from "firebase/firestore";
import { eventService } from "../services/firestore";
import { Event, PaginatedEvents } from "../types";

const EVENTS_QUERY_KEY = "events";

export function useEvents(pageSize = 10) {
  const {
    data,
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  } = useInfiniteQuery<PaginatedEvents, Error>(
    {
      queryKey: [EVENTS_QUERY_KEY, pageSize],
      queryFn: ({ pageParam }) => eventService.getEvents(pageSize, pageParam as QueryDocumentSnapshot<DocumentData, DocumentData> | undefined),
      getNextPageParam: (lastPage: PaginatedEvents) => lastPage.lastVisible,
      initialPageParam: undefined,
    }
  );

  return {
    data: data?.pages.flatMap((page) => page.events) || [],
    error,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
  };
}

export function useAdminEvents() {
  return useQuery<Event[], Error>({ 
    queryKey: ["adminEvents"], 
    queryFn: eventService.getAdminEvents 
  });
}

export function useEvent(eventId: string) {
  return useQuery<Event | null, Error>({
    queryKey: [EVENTS_QUERY_KEY, eventId],
    queryFn: () => eventService.getEventById(eventId),
    enabled: !!eventId, // Só executa a query se o eventId existir
  });
}
