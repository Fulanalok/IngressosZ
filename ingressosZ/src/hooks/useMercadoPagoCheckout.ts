import { appCheck, db, functions } from "@/firebaseConfig";
import { logger } from "@/services/logger";
import type { Event } from "@/types";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { getToken } from "firebase/app-check";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

if (MP_PUBLIC_KEY) {
  initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
}

const getAppCheckHeaders = async (): Promise<Record<string, string>> => {
  if (!appCheck) return {};
  try {
    const tokenResponse = await getToken(appCheck, false);
    return { "X-Firebase-AppCheck": tokenResponse.token };
  } catch {
    return {};
  }
};

export function useMercadoPagoCheckout(
  event: Event,
  ticketType: "standard" | "vip" | "premium",
  quantity: number,
  userId?: string,
  userEmail?: string
) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<{
    paymentId: string;
    qrCode: string;
    qrCodeBase64?: string;
    ticketUrl?: string;
    status?: string;
    paymentSessionId?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
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
    setPixData(null);

    try {
      toast.loading("Iniciando checkout...", { id: "checkout" });
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
        const prefId = (result?.data as any)?.id;
        if (prefId) {
          setPreferenceId(prefId);
          toast.success("Checkout iniciado!", { id: "checkout" });
          return;
        }
      } catch (callableErr) {
        if (!API_BASE_URL) {
          throw callableErr;
        }
      }

      const baseUrl = API_BASE_URL || "/functions";
      const appCheckHeaders = await getAppCheckHeaders();
      const response = await fetch(`${baseUrl}/createPaymentPreferencePublic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...appCheckHeaders },
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
        toast.success("Checkout iniciado!", { id: "checkout" });
      } else {
        throw new Error("Preference ID não recebido da API.");
      }
    } catch (err) {
      logger.error("Erro ao criar preferência", err);
      const msg =
        err instanceof Error ? err.message : "Erro ao iniciar checkout.";
      setError(msg);
      toast.error(msg, { id: "checkout" });
    } finally {
      setIsLoading(false);
    }
  };

  const createPixPayment = async () => {
    const normalizedEmail = userEmail?.trim();
    if (!event || !userId || !normalizedEmail) {
      setError("Faça login para continuar.");
      return;
    }

    setIsLoading(true);
    setError(null);
    setPreferenceId(null);

    try {
      toast.loading("Gerando PIX...", { id: "pix" });
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
        const createPixPaymentCallable = httpsCallable(
          functions,
          "createPixPayment"
        );
        const result = await createPixPaymentCallable({
          eventId: event.id,
          quantity,
          ticketType,
          userId,
          userEmail: normalizedEmail || "",
          paymentSessionId,
        });
        const data = (result?.data as any) || {};
        const qrCode = data?.qrCode || data?.qr_code;
        const paymentId = data?.paymentId || data?.id;
        if (qrCode && paymentId) {
          setPixData({
            paymentId,
            qrCode,
            qrCodeBase64: data?.qrCodeBase64 || data?.qr_code_base64 || "",
            ticketUrl: data?.ticketUrl || data?.ticket_url || "",
            status: data?.status,
            paymentSessionId,
          });
          toast.success("PIX gerado!", { id: "pix" });
          return;
        }
      } catch (callableErr) {
        if (!API_BASE_URL) {
          throw callableErr;
        }
      }

      const baseUrl = API_BASE_URL || "/functions";
      const appCheckHeaders = await getAppCheckHeaders();
      const response = await fetch(`${baseUrl}/createPixPaymentPublic`, {
        method: "POST",
        headers: { "Content-Type": "application/json", ...appCheckHeaders },
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
          `Erro ao criar Pix: ${errorData.message || "Sem detalhes"}`
        );
      }
      const responseText = await response.text();
      const data =
        responseText.trim().length > 0 ? JSON.parse(responseText) : {};
      const qrCode = data?.qrCode || data?.qr_code;
      const paymentId = data?.paymentId || data?.id;
      if (qrCode && paymentId) {
        setPixData({
          paymentId,
          qrCode,
          qrCodeBase64: data?.qrCodeBase64 || data?.qr_code_base64 || "",
          ticketUrl: data?.ticketUrl || data?.ticket_url || "",
          status: data?.status,
          paymentSessionId,
        });
        toast.success("PIX gerado!", { id: "pix" });
      } else {
        throw new Error("QR Code Pix não recebido da API.");
      }
    } catch (err) {
      logger.error("Erro ao criar Pix", err);
      const msg = err instanceof Error ? err.message : "Erro ao gerar PIX.";
      setError(msg);
      toast.error(msg, { id: "pix" });
    } finally {
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
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
    createPixPayment,
    preferenceId,
    pixData,
    isLoading,
    error,
    totalAmount,
    handlePaymentSuccess,
  };
}
