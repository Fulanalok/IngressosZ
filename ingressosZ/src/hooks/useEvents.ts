import { useQuery } from "@tanstack/react-query";
import { eventService } from "../services/firestore";
import type { Event } from "../types";

export function useEvents() {
  const { data, isLoading, error, refetch } = useQuery<Event[], Error>({
    queryKey: ["events"],
    queryFn: () => eventService.getEvents(),
    staleTime: 20 * 60 * 1000,
    gcTime: 60 * 60 * 1000,
  });

  return {
    events: data || [],
    loading: isLoading,
    error: error ? error.message : null,
    refetch,
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
