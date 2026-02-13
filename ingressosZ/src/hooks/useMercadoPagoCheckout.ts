import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Preference, initMercadoPago } from "@mercadopago/sdk-react";
import { addDoc, collection, serverTimestamp, Timestamp } from "firebase/firestore";
import { db } from "../firebaseConfig";
import { eventService } from "../services/firestore";
import type { Event, PaymentSession, Ticket } from "../types";

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

// Inicialize o Mercado Pago fora do hook para evitar reinicializações
initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });

export function useMercadoPagoCheckout(
  event: Event,
  ticketType: "standard" | "vip" | "premium",
  quantity: number,
  userId: string,
  userEmail: string
) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const unitPrice = event.pricing?.[ticketType] ?? event.price;
  const totalAmount = unitPrice * quantity;

  const createPreference = async () => {
    if (!event || !userId) return;

    setIsLoading(true);
    setError(null);

    try {
      // 1. Criar uma sessão de pagamento no Firestore
      const paymentSessionRef = await addDoc(collection(db, "paymentSessions"), {
        eventId: event.id,
        userId,
        ticketType,
        quantity,
        unitPrice,
        totalAmount,
        status: "pending",
        provider: "mercadopago",
        createdAt: serverTimestamp(),
      });

      const paymentSessionId = paymentSessionRef.id;

      // 2. Chamar a Cloud Function para criar a preferência de pagamento
      const response = await fetch(`${API_BASE_URL}/create-preference`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentSessionId,
          eventTitle: event.title,
          unitPrice,
          quantity,
          userEmail,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          `Erro ao criar preferência: ${errorData.message || "Sem detalhes"}`
        );
      }

      const data = await response.json();
      if (data.preferenceId) {
        setPreferenceId(data.preferenceId);
      } else {
        throw new Error("Preference ID não recebido da API.");
      }
    } catch (err) {
      console.error("Erro detalhado ao criar preferência:", err);
      setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
      // Opcional: navegar para uma página de erro
      // navigate("/pagamento/erro");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setIsLoading(true);
    try {
      // Este é um placeholder. A lógica principal deve ser no backend via webhook.
      // No entanto, podemos criar o ingresso aqui para uma resposta mais rápida na UI

      for (let i = 0; i < quantity; i++) {
        const newTicket: Omit<Ticket, "id"> = {
          eventId: event.id,
          userId,
          userEmail,
          purchaseDate: Timestamp.now(),
          qrCode: `qr_${userId}_${event.id}_${Date.now()}_${i}`,
          status: "active",
          price: unitPrice,
          ticketType,
        };
        // Idealmente, isso deve ser feito em uma batch write no backend
        // quando o pagamento for confirmado
        await eventService.decrementAvailableTickets(event.id, 1);
      }

      // Navega para a página de sucesso
      navigate(`/payment-success?payment_id=${paymentId}`);
    } catch (err) {
      console.error("Erro no pós-pagamento (cliente):", err);
      // Mesmo com erro aqui, o backend deve garantir a criação do ingresso
      // Navegar para uma tela que possa re-verificar o status do ingresso
      navigate(`/my-tickets`);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    createPreference,
    preferenceId,
    isLoading,
    error,
    totalAmount,
    handlePaymentSuccess, // Expondo para uso com o Brick
  };
}
