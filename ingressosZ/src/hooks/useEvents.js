import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { eventService } from "../services/firestore";
const EVENTS_QUERY_KEY = "events";
export function useEvents(pageSize = 10) {
    const { data, error, fetchNextPage, hasNextPage, isFetchingNextPage, status, } = useInfiniteQuery({
        queryKey: [EVENTS_QUERY_KEY, pageSize],
        queryFn: ({ pageParam }) => eventService.getEvents(pageSize, pageParam),
        getNextPageParam: (lastPage) => lastPage.lastVisible,
        initialPageParam: undefined,
    });
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
    return useQuery({
        queryKey: ["adminEvents"],
        queryFn: eventService.getAdminEvents
    });
}
export function useEvent(eventId) {
    return useQuery({
        queryKey: [EVENTS_QUERY_KEY, eventId],
        queryFn: () => eventService.getEventById(eventId),
        enabled: !!eventId, // Só executa a query se o eventId existir
    });
}
