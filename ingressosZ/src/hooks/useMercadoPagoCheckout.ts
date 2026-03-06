import { db } from "@/firebaseConfig";
import { eventService } from "@/services/firestore";
import type { Event } from "@/types";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { getFunctions, httpsCallable } from "firebase/functions";
import { useState } from "react";
import { useNavigate } from "react-router-dom";

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

if (MP_PUBLIC_KEY) {
  initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
}

export function useMercadoPagoCheckout(
  event: Event,
  ticketType: "standard" | "vip" | "premium",
  quantity: number,
  userId?: string,
  userEmail?: string
) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  const unitPrice = event.pricing?.[ticketType] ?? event.price;
  const totalAmount = unitPrice * quantity;

  const createPreference = async () => {
    const normalizedEmail = userEmail?.trim();
    if (!event || (!userId && !normalizedEmail)) return;

    setIsLoading(true);
    setError(null);

    try {
      const paymentSessionRef = await addDoc(
        collection(db, "paymentSessions"),
        {
          eventId: event.id,
          userId: userId || "guest",
          userEmail: normalizedEmail || "",
          ticketType,
          quantity,
          unitPrice,
          totalAmount,
          status: "pending",
          provider: "mercadopago",
          createdAt: serverTimestamp(),
        }
      );

      const paymentSessionId = paymentSessionRef.id;

      if (userId) {
        try {
          const functions = getFunctions();
          const createPaymentPreference = httpsCallable(
            functions,
            "createPaymentPreference"
          );
          const result = await createPaymentPreference({
            eventId: event.id,
            quantity,
            userId,
            userEmail: normalizedEmail || "",
          });
          const prefId = (result?.data as any)?.id;
          if (prefId) {
            setPreferenceId(prefId);
            return;
          }
        } catch (callableErr) {
          if (!API_BASE_URL) {
            throw callableErr;
          }
        }
      }

      const baseUrl = API_BASE_URL || "/functions";
      const response = await fetch(
        `${baseUrl}/createPaymentPreferencePublic`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            paymentSessionId,
            eventId: event.id,
            quantity,
            userEmail: normalizedEmail,
          }),
        }
      );
        if (!response.ok) {
          const errorText = await response.text();
          const errorData =
            errorText.trim().length > 0 ? JSON.parse(errorText) : {};
          throw new Error(
            `Erro ao criar preferência: ${errorData.message || "Sem detalhes"}`
          );
        }
      const responseText = await response.text();
      const data = responseText.trim().length > 0 ? JSON.parse(responseText) : {};
      const prefId = data?.preferenceId || data?.id;
      if (prefId) {
        setPreferenceId(prefId);
      } else {
        throw new Error("Preference ID não recebido da API.");
      }
    } catch (err) {
      console.error("Erro detalhado ao criar preferência:", err);
      setError(
        err instanceof Error ? err.message : "Ocorreu um erro desconhecido."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setIsLoading(true);
    try {
      for (let i = 0; i < quantity; i++) {
        await eventService.decrementAvailableTickets(event.id, 1);
      }

      navigate(`/pagamento/sucesso?payment_id=${paymentId}`);
    } catch (err) {
      console.error("Erro no pós-pagamento (cliente):", err);
      navigate(`/meus-ingressos`);
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
    handlePaymentSuccess,
  };
}
