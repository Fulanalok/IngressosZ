import { db } from "@/firebaseConfig";
import { eventService } from "@/services/firestore";
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
export function useMercadoPagoCheckout(event, ticketType, quantity, userId, userEmail) {
    const [preferenceId, setPreferenceId] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const navigate = useNavigate();
    const unitPrice = event.pricing?.[ticketType] ?? event.price;
    const totalAmount = unitPrice * quantity;
    const createPreference = async () => {
        if (!event || !userId)
            return;
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
            try {
                const functions = getFunctions();
                const createPaymentPreference = httpsCallable(functions, "createPaymentPreference");
                const result = await createPaymentPreference({
                    eventId: event.id,
                    quantity,
                    userId,
                });
                const prefId = result?.data?.id;
                if (prefId) {
                    setPreferenceId(prefId);
                    return;
                }
            }
            catch (callableErr) {
                if (!API_BASE_URL) {
                    throw callableErr;
                }
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
                    const errorText = await response.text();
                    const errorData = errorText.trim().length > 0 ? JSON.parse(errorText) : {};
                    throw new Error(`Erro ao criar preferência: ${errorData.message || "Sem detalhes"}`);
                }
                const responseText = await response.text();
                const data = responseText.trim().length > 0 ? JSON.parse(responseText) : {};
                const prefId = data?.preferenceId || data?.id;
                if (prefId) {
                    setPreferenceId(prefId);
                }
                else {
                    throw new Error("Preference ID não recebido da API.");
                }
            }
        }
        catch (err) {
            console.error("Erro detalhado ao criar preferência:", err);
            setError(err instanceof Error ? err.message : "Ocorreu um erro desconhecido.");
            // Opcional: navegar para uma página de erro
            // navigate("/pagamento/erro");
        }
        finally {
            setIsLoading(false);
        }
    };
    const handlePaymentSuccess = async (paymentId) => {
        setIsLoading(true);
        try {
            // Este é um placeholder. A lógica principal deve ser no backend via webhook.
            // No entanto, podemos criar o ingresso aqui para uma resposta mais rápida na UI
            for (let i = 0; i < quantity; i++) {
                // Idealmente, isso deve ser feito em uma batch write no backend
                // quando o pagamento for confirmado
                await eventService.decrementAvailableTickets(event.id, 1);
            }
            // Navega para a página de sucesso
            navigate(`/pagamento/sucesso?payment_id=${paymentId}`);
        }
        catch (err) {
            console.error("Erro no pós-pagamento (cliente):", err);
            // Mesmo com erro aqui, o backend deve garantir a criação do ingresso
            // Navegar para uma tela que possa re-verificar o status do ingresso
            navigate(`/meus-ingressos`);
        }
        finally {
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
