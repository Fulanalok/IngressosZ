import { useState } from "react";
import { eventService, ticketService } from "../services/firestore";
import { useAuth } from "./useAuth";

interface UseMercadoPagoCheckoutProps {
  eventId: string;
  ticketType: "standard" | "vip" | "premium";
  quantity?: number;
}

export function useMercadoPagoCheckout({
  eventId,
  ticketType,
  quantity = 1,
}: UseMercadoPagoCheckoutProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<
    "idle" | "processing" | "succeeded" | "failed"
  >("idle");
  const { user, getAuthHeaders } = useAuth();

  const functionsBase = `/functions`;

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const retryFetch = async (
    input: RequestInfo,
    init: RequestInit,
    tries = 3
  ) => {
    let lastErr: unknown = null;
    for (let attempt = 0; attempt < tries; attempt++) {
      try {
        const resp = await fetch(input, init);
        if (resp.status >= 500 || resp.status === 429) {
          const backoff = Math.min(2000, 300 * Math.pow(2, attempt));
          await sleep(backoff);
          continue;
        }
        return resp;
      } catch (e) {
        lastErr = e;
        const backoff = Math.min(2000, 300 * Math.pow(2, attempt));
        await sleep(backoff);
      }
    }
    if (lastErr) throw lastErr;
    throw new Error("Falha de rede ao criar preferência");
  };

  const createPreference = async () => {
    if (!user) {
      setError("Usuário não autenticado");
      return null;
    }

    setLoading(true);
    setError(null);
    setPaymentStatus("processing");

    try {
      const authHeaders = (await getAuthHeaders?.()) || {};
      const idempotencyKey =
        typeof crypto !== "undefined" && "randomUUID" in crypto
          ? crypto.randomUUID()
          : `idem-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const resp = await retryFetch(
        `${functionsBase}/mercadoPagoCreatePreference`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            ...authHeaders,
            "X-Idempotency-Key": idempotencyKey,
          },
          referrerPolicy: "no-referrer",
          credentials: "omit",
          cache: "no-store",
          body: JSON.stringify({
            eventId,
            ticketType,
            quantity,
            userId: user.uid,
          }),
        }
      );

      if (!resp.ok) {
        const text = await resp.text();
        throw new Error(`Falha ao criar preferência (${resp.status}): ${text}`);
      }

      const data = await resp.json();
      const redirectUrl = data?.init_point || data?.sandbox_init_point;
      if (!redirectUrl) throw new Error("URL de checkout não retornada");

      const allowedHosts = ["www.mercadopago.com", "www.mercadopago.com.br"];
      const isDevRelative = import.meta.env.DEV && redirectUrl.startsWith("/");
      const isAllowedHost = (() => {
        try {
          const u = new URL(redirectUrl);
          return allowedHosts.includes(u.hostname) && u.protocol === "https:";
        } catch {
          return false;
        }
      })();
      if (!isAllowedHost && !isDevRelative) {
        throw new Error("Redirecionamento não permitido");
      }

      // Redirect to Mercado Pago Checkout Pro
      window.location.assign(redirectUrl as string);
      return { preferenceId: data?.preferenceId, url: redirectUrl };
    } catch (err) {
      console.error("Erro ao iniciar pagamento Mercado Pago:", err);
      const errorMessage =
        err instanceof Error ? err.message : "Erro ao processar pagamento";
      setError(errorMessage);
      setPaymentStatus("failed");

      // Fallback: simular pagamento em ambiente de desenvolvimento
      if (import.meta.env.DEV && user) {
        console.log(
          "🔧 Modo desenvolvimento: simulando pagamento aprovado (Mercado Pago)"
        );
        for (let i = 0; i < quantity; i++) {
          const ticketData = {
            eventId,
            userId: user.uid,
            userEmail: user.email || "usuario@exemplo.com",
            status: "active" as const,
            ticketType,
            price: 0,
            validatedAt: undefined,
            validatedBy: undefined,
            provider: "mercadopago",
          };

          await ticketService.createTicket(ticketData);
          console.log(`📋 Ingresso ${i + 1}/${quantity} criado (simulação)`);
        }
        try {
          await eventService.decrementAvailableTickets(
            eventId,
            quantity
          );
        } catch {
          /* ignore */
        }

        setPaymentStatus("succeeded");
        return {
          preferenceId: `dev_pref_${Date.now()}`,
          url: "/pagamento/sucesso",
        };
      }

      return null;
    } finally {
      setLoading(false);
    }
  };

  const resetPaymentState = () => {
    setLoading(false);
    setError(null);
    setPaymentStatus("idle");
  };

  return { createPreference, loading, error, paymentStatus, resetPaymentState };
}
