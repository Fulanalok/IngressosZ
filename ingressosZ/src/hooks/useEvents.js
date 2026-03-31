import { useInfiniteQuery, useQuery, useQueryClient, } from "@tanstack/react-query";
import { doc, onSnapshot, } from "firebase/firestore";
import { useEffect } from "react";
import { db } from "../firebaseConfig";
import { eventService } from "../services/firestore";
const EVENTS_QUERY_KEY = "events";
export function useEvents(pageSize = 10) {
    const queryClient = useQueryClient();
    const query = useInfiniteQuery({
        queryKey: [EVENTS_QUERY_KEY, pageSize],
        queryFn: ({ pageParam }) => eventService.getEvents(pageSize, pageParam),
        getNextPageParam: (lastPage) => lastPage.lastVisible,
        initialPageParam: undefined,
    });
    // Escuta atualizações em tempo real para todos os eventos visíveis na lista
    useEffect(() => {
        const events = query.data?.pages.flatMap((page) => page.events) || [];
        if (events.length === 0)
            return;
        const unsubscribes = events.map((event) => {
            return onSnapshot(doc(db, "events", event.id), (snapshot) => {
                if (snapshot.exists()) {
                    const updatedEvent = { id: snapshot.id, ...snapshot.data() };
                    // Atualiza o cache do TanStack Query sem disparar uma nova requisição de rede
                    queryClient.setQueryData([EVENTS_QUERY_KEY, pageSize], (oldData) => {
                        if (!oldData)
                            return oldData;
                        return {
                            ...oldData,
                            pages: oldData.pages.map((page) => ({
                                ...page,
                                events: page.events.map((eventItem) => eventItem.id === updatedEvent.id ? updatedEvent : eventItem),
                            })),
                        };
                    });
                }
            });
        });
        return () => unsubscribes.forEach((unsub) => unsub());
    }, [query.data, pageSize, queryClient]);
    return {
        data: query.data?.pages.flatMap((page) => page.events) || [],
        error: query.error,
        fetchNextPage: query.fetchNextPage,
        hasNextPage: query.hasNextPage,
        isFetchingNextPage: query.isFetchingNextPage,
        status: query.status,
    };
}
export function useAdminEvents() {
    return useQuery({
        queryKey: ["adminEvents"],
        queryFn: eventService.getAdminEvents,
    });
}
export function useEvent(eventId) {
    const queryClient = useQueryClient();
    const query = useQuery({
        queryKey: [EVENTS_QUERY_KEY, eventId],
        queryFn: () => eventService.getEventById(eventId),
        enabled: !!eventId,
    });
    // Escuta atualizações em tempo real para o evento específico (detalhes)
    useEffect(() => {
        if (!eventId)
            return;
        const unsubscribe = onSnapshot(doc(db, "events", eventId), (snapshot) => {
            if (snapshot.exists()) {
                const updatedEvent = { id: snapshot.id, ...snapshot.data() };
                queryClient.setQueryData([EVENTS_QUERY_KEY, eventId], updatedEvent);
            }
        });
        return () => unsubscribe();
    }, [eventId, queryClient]);
    return query;
}
