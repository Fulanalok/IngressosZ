import { db, functions } from "@/firebaseConfig";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
const API_BASE_URL = import.meta.env.VITE_API_URL || "";
if (MP_PUBLIC_KEY) {
  initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
}
export function useMercadoPagoCheckout(
  event,
  ticketType,
  quantity,
  userId,
  userEmail
) {
  const [preferenceId, setPreferenceId] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();
  const unitPrice = event.pricing?.[ticketType] ?? event.price;
  const totalAmount = unitPrice * quantity;
  const createPreference = async () => {
    const normalizedEmail = userEmail?.trim();
    if (!event || !userId || !normalizedEmail) {
      setError("Faça login para continuar.");
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const paymentSessionRef = await addDoc(
        collection(db, "paymentSessions"),
        {
          eventId: event.id,
          userId,
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
      try {
        const createPaymentPreference = httpsCallable(
          functions,
          "createPaymentPreference"
        );
        const result = await createPaymentPreference({
          eventId: event.id,
          quantity,
          ticketType,
          userId,
          userEmail: normalizedEmail || "",
          paymentSessionId,
        });
        const prefId = result?.data?.id;
        if (prefId) {
          setPreferenceId(prefId);
          return;
        }
      } catch (callableErr) {
        if (!API_BASE_URL) {
          throw callableErr;
        }
      }
      const baseUrl = API_BASE_URL || "/functions";
      const response = await fetch(`${baseUrl}/createPaymentPreferencePublic`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          quantity,
          ticketType,
          paymentSessionId,
          userId,
          userEmail: normalizedEmail,
        }),
      });
      if (!response.ok) {
        const errorText = await response.text();
        const errorData =
          errorText.trim().length > 0 ? JSON.parse(errorText) : {};
        throw new Error(
          `Erro ao criar preferência: ${errorData.message || "Sem detalhes"}`
        );
      }
      const responseText = await response.text();
      const data =
        responseText.trim().length > 0 ? JSON.parse(responseText) : {};
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
  const handlePaymentSuccess = async (paymentId) => {
    setIsLoading(true);
    try {
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
