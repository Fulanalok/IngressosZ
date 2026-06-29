import { appCheck, db, functions } from "@/firebaseConfig";
import { logger } from "@/services/logger";
import type { Event } from "@/types";
import { initMercadoPago } from "@mercadopago/sdk-react";
import { getToken } from "firebase/app-check";
import { addDoc, collection, serverTimestamp } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import { useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";

type TicketType = "standard" | "vip" | "premium";
type PaymentMethod = "checkout" | "pix";

interface PreferenceCallableResult {
  id: string;
}

interface PixCallableResult {
  qrCode?: string;
  qr_code?: string;
  qrCodeBase64?: string;
  qr_code_base64?: string;
  paymentId?: string;
  id?: string;
  ticketUrl?: string;
  ticket_url?: string;
  status?: string;
}

interface PaymentPayload {
  eventId: string;
  quantity: number;
  ticketType: TicketType;
  userId: string;
  userEmail: string;
  paymentSessionId: string;
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

const readJsonResponse = async (response: Response) => {
  const responseText = await response.text();
  return responseText.trim().length > 0 ? JSON.parse(responseText) : {};
};

const getResponseMessage = async (response: Response) => {
  const data = await readJsonResponse(response);
  return data?.message || "Sem detalhes";
};

const getPreferenceId = (data: { preferenceId?: string; id?: string }) =>
  data.preferenceId || data.id;

const getPixData = (
  data: PixCallableResult,
  paymentSessionId: string
): PixData | null => {
  const qrCode = data.qrCode || data.qr_code;
  const paymentId = data.paymentId || data.id;

  if (!qrCode || !paymentId) return null;

  return {
    paymentId,
    qrCode,
    qrCodeBase64: data.qrCodeBase64 || data.qr_code_base64 || "",
    ticketUrl: data.ticketUrl || data.ticket_url || "",
    status: data.status,
    paymentSessionId,
  };
};

const createPaymentSession = async (
  event: Event,
  ticketType: TicketType,
  quantity: number,
  userId: string,
  userEmail: string,
  paymentMethod: PaymentMethod
) => {
  const unitPrice = event.pricing?.[ticketType] ?? event.price;
  const totalAmount = unitPrice * quantity;
  const paymentSessionRef = await addDoc(collection(db, "paymentSessions"), {
    eventId: event.id,
    userId,
    userEmail,
    ticketType,
    quantity,
    unitPrice,
    totalAmount,
    status: "pending",
    paymentMethod,
    provider: "mercadopago",
    createdAt: serverTimestamp(),
  });

  return paymentSessionRef.id;
};

const createPayload = (
  event: Event,
  ticketType: TicketType,
  quantity: number,
  userId: string,
  userEmail: string,
  paymentSessionId: string
): PaymentPayload => ({
  eventId: event.id,
  quantity,
  ticketType,
  userId,
  userEmail,
  paymentSessionId,
});

const callPreferenceCallable = async (payload: PaymentPayload) => {
  const createPaymentPreference = httpsCallable(
    functions,
    "createPaymentPreference"
  );
  const result = await createPaymentPreference(payload);
  return (result?.data as PreferenceCallableResult)?.id || null;
};

const callPreferenceHttp = async (payload: PaymentPayload) => {
  const baseUrl = API_BASE_URL || "/functions";
  const appCheckHeaders = await getAppCheckHeaders();
  const response = await fetch(`${baseUrl}/createPaymentPreferencePublic`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...appCheckHeaders },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar preferência: ${await getResponseMessage(response)}`);
  }

  return getPreferenceId(await readJsonResponse(response));
};

const callPixCallable = async (payload: PaymentPayload) => {
  const createPixPaymentCallable = httpsCallable(functions, "createPixPayment");
  const result = await createPixPaymentCallable(payload);
  return getPixData((result?.data as PixCallableResult) || {}, payload.paymentSessionId);
};

const callPixHttp = async (payload: PaymentPayload) => {
  const baseUrl = API_BASE_URL || "/functions";
  const appCheckHeaders = await getAppCheckHeaders();
  const response = await fetch(`${baseUrl}/createPixPaymentPublic`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...appCheckHeaders },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error(`Erro ao criar Pix: ${await getResponseMessage(response)}`);
  }

  return getPixData(await readJsonResponse(response), payload.paymentSessionId);
};

const requestPreferenceId = async (payload: PaymentPayload) => {
  try {
    const preferenceId = await callPreferenceCallable(payload);
    if (preferenceId) return preferenceId;
  } catch (callableErr) {
    if (!API_BASE_URL) throw callableErr;
  }

  const preferenceId = await callPreferenceHttp(payload);
  if (!preferenceId) throw new Error("Preference ID não recebido da API.");
  return preferenceId;
};

const requestPixData = async (payload: PaymentPayload) => {
  try {
    const pixData = await callPixCallable(payload);
    if (pixData) return pixData;
  } catch (callableErr) {
    if (!API_BASE_URL) throw callableErr;
  }

  const pixData = await callPixHttp(payload);
  if (!pixData) throw new Error("QR Code Pix não recebido da API.");
  return pixData;
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
  const navigate = useNavigate();

  const unitPrice = event.pricing?.[ticketType] ?? event.price;
  const totalAmount = unitPrice * quantity;

  const getNormalizedEmail = () => userEmail?.trim().toLowerCase() || "";

  const getValidatedUser = () => {
    const normalizedEmail = getNormalizedEmail();

    if (!event || !userId || !normalizedEmail) {
      setError("Faça login para continuar.");
      return null;
    }

    return { userId, userEmail: normalizedEmail };
  };

  const preparePayment = async (paymentMethod: PaymentMethod) => {
    const validatedUser = getValidatedUser();
    if (!validatedUser) return null;

    const paymentSessionId = await createPaymentSession(
      event,
      ticketType,
      quantity,
      validatedUser.userId,
      validatedUser.userEmail,
      paymentMethod
    );

    return createPayload(
      event,
      ticketType,
      quantity,
      validatedUser.userId,
      validatedUser.userEmail,
      paymentSessionId
    );
  };

  const createPreference = async () => {
    setIsLoading(true);
    setError(null);
    setPixData(null);

    try {
      toast.loading("Iniciando checkout...", { id: "checkout" });
      const payload = await preparePayment("checkout");
      if (!payload) return;
      setPreferenceId(await requestPreferenceId(payload));
      toast.success("Checkout iniciado!", { id: "checkout" });
    } catch (err) {
      logger.error("Erro ao criar preferência", err);
      const msg = err instanceof Error ? err.message : "Erro ao iniciar checkout.";
      setError(msg);
      toast.error(msg, { id: "checkout" });
    } finally {
      setIsLoading(false);
    }
  };

  const createPixPayment = async () => {
    setIsLoading(true);
    setError(null);
    setPreferenceId(null);

    try {
      toast.loading("Gerando PIX...", { id: "pix" });
      const payload = await preparePayment("pix");
      if (!payload) return;
      setPixData(await requestPixData(payload));
      toast.success("PIX gerado!", { id: "pix" });
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
      logger.error("Erro no pós-pagamento (cliente)", err as Error);
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
