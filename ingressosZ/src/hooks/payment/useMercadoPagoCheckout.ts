import { functions } from "@/firebaseConfig";
import { logger } from "@/services/logger";
import type { Event } from "@/types";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { httpsCallable } from "firebase/functions";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type TicketType = "standard" | "vip" | "premium";
type PaymentMethod = "checkout" | "pix";

interface PaymentSessionResult {
  paymentSessionId: string;
  expiresAt: unknown;
}

interface PreferenceCallableResult {
  id: string;
}

interface PixCallableResult {
  qrCode?: string;
  qrCodeBase64?: string;
  paymentId?: string;
  id?: string;
  ticketUrl?: string;
  status?: string;
}

interface PixData {
  paymentId: string;
  qrCode: string;
  qrCodeBase64?: string;
  ticketUrl?: string;
  status?: string;
  paymentSessionId?: string;
}

const MP_PUBLIC_KEY = import.meta.env.VITE_MERCADOPAGO_PUBLIC_KEY;

if (MP_PUBLIC_KEY) {
  initMercadoPago(MP_PUBLIC_KEY, { locale: "pt-BR" });
}

const createBackendPaymentSession = async (
  eventId: string,
  ticketType: TicketType,
  quantity: number,
  paymentMethod: PaymentMethod
) => {
  const callable = httpsCallable<
    {
      eventId: string;
      ticketType: TicketType;
      quantity: number;
      paymentMethod: PaymentMethod;
    },
    PaymentSessionResult
  >(functions, "createPaymentSession");
  const result = await callable({ eventId, ticketType, quantity, paymentMethod });
  if (!result.data.paymentSessionId) {
    throw new Error("Sessao de pagamento nao recebida.");
  }
  return result.data.paymentSessionId;
};

const requestPreferenceId = async (paymentSessionId: string) => {
  const callable = httpsCallable<
    { paymentSessionId: string },
    PreferenceCallableResult
  >(functions, "createPaymentPreference");
  const result = await callable({ paymentSessionId });
  if (!result.data.id) throw new Error("Preference ID nao recebido da API.");
  return result.data.id;
};

const requestPixData = async (paymentSessionId: string): Promise<PixData> => {
  const callable = httpsCallable<
    { paymentSessionId: string },
    PixCallableResult
  >(functions, "createPixPayment");
  const result = await callable({ paymentSessionId });
  const data = result.data;
  const paymentId = data.paymentId || data.id;
  if (!data.qrCode || !paymentId) {
    throw new Error("QR Code Pix nao recebido da API.");
  }
  return {
    paymentId,
    qrCode: data.qrCode,
    qrCodeBase64: data.qrCodeBase64 || "",
    ticketUrl: data.ticketUrl || "",
    status: data.status,
    paymentSessionId,
  };
};

export function useMercadoPagoCheckout(
  event: Event,
  ticketType: TicketType,
  quantity: number,
  userId?: string,
  userEmail?: string
) {
  const [preferenceId, setPreferenceId] = useState<string | null>(null);
  const [pixData, setPixData] = useState<PixData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const operationInFlight = useRef(false);
  const navigate = useNavigate();

  const unitPrice = event.pricing?.[ticketType] ?? event.price;
  const totalAmount = unitPrice * quantity;

  const isAuthenticated = () => {
    if (!event || !userId || !userEmail?.trim()) {
      setError("Faca login para continuar.");
      return false;
    }
    return true;
  };

  const createPreference = async () => {
    if (operationInFlight.current) return;
    if (!isAuthenticated()) return;
    operationInFlight.current = true;
    setIsLoading(true);
    setError(null);
    setPixData(null);
    try {
      toast.loading("Iniciando checkout...", { id: "checkout" });
      const paymentSessionId = await createBackendPaymentSession(
        event.id,
        ticketType,
        quantity,
        "checkout"
      );
      setPreferenceId(await requestPreferenceId(paymentSessionId));
      toast.success("Checkout iniciado!", { id: "checkout" });
    } catch (err) {
      logger.error("Erro ao criar preferencia", err);
      const message =
        err instanceof Error ? err.message : "Erro ao iniciar checkout.";
      setError(message);
      toast.error(message, { id: "checkout" });
    } finally {
      operationInFlight.current = false;
      setIsLoading(false);
    }
  };

  const createPixPayment = async () => {
    if (operationInFlight.current) return;
    if (!isAuthenticated()) return;
    operationInFlight.current = true;
    setIsLoading(true);
    setError(null);
    setPreferenceId(null);
    try {
      toast.loading("Gerando PIX...", { id: "pix" });
      const paymentSessionId = await createBackendPaymentSession(
        event.id,
        ticketType,
        quantity,
        "pix"
      );
      setPixData(await requestPixData(paymentSessionId));
      toast.success("PIX gerado!", { id: "pix" });
    } catch (err) {
      logger.error("Erro ao criar Pix", err);
      const message = err instanceof Error ? err.message : "Erro ao gerar PIX.";
      setError(message);
      toast.error(message, { id: "pix" });
    } finally {
      operationInFlight.current = false;
      setIsLoading(false);
    }
  };

  const handlePaymentSuccess = async (paymentId: string) => {
    setIsLoading(true);
    try {
      navigate(`/pagamento/sucesso?payment_id=${paymentId}`);
    } catch (err) {
      logger.error("Erro no pos-pagamento (cliente)", err as Error);
      navigate("/meus-ingressos");
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
