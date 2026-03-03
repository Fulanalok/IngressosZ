import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect } from "react";
import { ticketService } from "@/services/firestore";
const TICKETS_QUERY_KEY = "tickets";
export function useUserTickets(userId) {
    const queryClient = useQueryClient();
    const { data, isLoading, error } = useQuery({
        queryKey: [TICKETS_QUERY_KEY, userId],
        queryFn: () => ticketService.getUserTickets(userId), // O '!' assume que a query só roda se userId existir
        enabled: !!userId, // A query só será executada se o userId não for undefined
    });
    // Configura a inscrição em tempo real
    useEffect(() => {
        if (!userId)
            return;
        const unsubscribe = ticketService.subscribeToUserTickets(userId, (updatedTickets) => {
            queryClient.setQueryData([TICKETS_QUERY_KEY, userId], updatedTickets);
        }, (err) => {
            console.error("Erro na inscrição de ingressos:", err);
        });
        // Cleanup da inscrição ao desmontar o componente
        return () => unsubscribe();
    }, [userId, queryClient]);
    return { tickets: data, isLoading, error };
}
export function useTicket(ticketId) {
    return useQuery({
        queryKey: [TICKETS_QUERY_KEY, ticketId],
        queryFn: () => ticketService.getTicketById(ticketId),
        enabled: !!ticketId
    });
}
export function useCreateTicket() {
    const queryClient = useQueryClient();
    return useMutation({
        mutationFn: async (ticketData) => {
            return await ticketService.createTicket(ticketData);
        },
        onSuccess: (_, variables) => {
            // Invalida a query de ingressos do usuário para buscar os dados atualizados
            queryClient.invalidateQueries({ queryKey: [TICKETS_QUERY_KEY, variables.userId] });
        }
    });
}
export function useAllTickets() {
    return useQuery({
        queryKey: ["allTickets"],
        queryFn: ticketService.getAllTickets
    });
}
