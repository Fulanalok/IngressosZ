import { useState, useEffect } from "react";
import { ticketService } from "../services/firestore";
import { useAuth } from "./useAuth";
import type { Ticket } from "../types";

export function useUserTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    if (!user) {
      setTickets([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    const unsubscribe = ticketService.subscribeToUserTickets(
      user.uid,
      (updatedTickets) => {
        setTickets(updatedTickets);
        setLoading(false);
      },
      (err) => {
        console.error("Erro ao carregar ingressos:", err);
        setError(err.message || "Erro ao carregar ingressos");
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [user, retryCount]);

  const refetchTickets = () => {
    setRetryCount((prev) => prev + 1);
  };

  const createTicket = async (
    ticketData: Omit<Ticket, "id" | "purchaseDate" | "qrCode">
  ) => {
    try {
      const ticketId = await ticketService.createTicket(ticketData);
      // A subscrição atualizará a lista automaticamente
      return ticketId;
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao criar ingresso";
      setError(errorMessage);
      throw err;
    }
  };

  return {
    tickets,
    loading,
    error,
    refetch: refetchTickets,
    createTicket,
  };
}

export function useTicketValidation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const validateTicket = async (ticketId: string, qrCode: string) => {
    try {
      setLoading(true);
      setError(null);

      // Buscar ingresso no Firestore
      const ticket = await ticketService.getTicketForValidation(
        ticketId,
        qrCode
      );

      if (!ticket) {
        throw new Error("Ingresso não encontrado ou QR Code inválido");
      }

      if (ticket.status === "used") {
        throw new Error("Este ingresso já foi utilizado");
      }

      if (ticket.status === "cancelled") {
        throw new Error("Este ingresso foi cancelado");
      }

      return {
        success: true,
        ticket,
        message: "Ingresso válido!",
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao validar ingresso";
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  const markTicketAsUsed = async (
    ticketId: string,
    validatorUserId: string
  ) => {
    try {
      setLoading(true);
      setError(null);

      await ticketService.markTicketAsUsed(ticketId, validatorUserId);

      return {
        success: true,
        message: "Ingresso marcado como usado com sucesso!",
      };
    } catch (err) {
      const errorMessage =
        err instanceof Error
          ? err.message
          : "Erro ao marcar ingresso como usado";
      setError(errorMessage);
      return {
        success: false,
        message: errorMessage,
      };
    } finally {
      setLoading(false);
    }
  };

  return {
    validateTicket,
    markTicketAsUsed,
    loading,
    error,
  };
}
