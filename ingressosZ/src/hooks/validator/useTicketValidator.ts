import { useState } from "react";
import { logger } from "../../services/logger";
import { TestDataService } from "../../services/testDataService";
import { appCheck } from "@/firebaseConfig";
import { useAuth } from "@/hooks/auth/useAuth";
import { getToken } from "firebase/app-check";

export interface TicketData {
  eventTitle: string;
  ticketType: string;
  holderName: string;
  eventDate: string;
  eventTime: string;
}

export interface ValidationResultState {
  status: "success" | "error" | "invalid" | null;
  message: string;
  ticketData?: TicketData;
}

export function useTicketValidator() {
  const { user } = useAuth();
  const [isValidating, setIsValidating] = useState(false);
  const [validationResult, setValidationResult] =
    useState<ValidationResultState>({
      status: null,
      message: "",
    });

  const validateTicket = async (code: string) => {
    const codeToValidate = code.trim();
    setIsValidating(true);
    setValidationResult({ status: null, message: "" });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10_000);

    try {
      const functionsUrl = `/functions`;
      const token =
        user && user.getIdToken ? await user.getIdToken(false) : undefined;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;
      if (appCheck) {
        try {
          const appCheckToken = await getToken(appCheck, false);
          headers["X-Firebase-AppCheck"] = appCheckToken.token;
        } catch (error) {
          logger.warn("Falha ao obter App Check para validação", {
            error: error instanceof Error ? error.message : "unknown",
          });
        }
      }

      let resp = await fetch(`${functionsUrl}/validateTicket`, {
        method: "POST",
        headers,
        body: JSON.stringify({ qrCode: codeToValidate }),
        signal: controller.signal,
      });

      // On 401 retry once with a fresh token (handles token expiry)
      if (resp.status === 401 && user) {
        const freshToken = await user.getIdToken(true);
        headers["Authorization"] = `Bearer ${freshToken}`;
        resp = await fetch(`${functionsUrl}/validateTicket`, {
          method: "POST",
          headers,
          body: JSON.stringify({ qrCode: codeToValidate }),
          signal: controller.signal,
        });
      }

      const data = await resp.json();

      if (resp.ok && data?.success) {
        const details = data?.ticket;
        const result: ValidationResultState = {
          status: "success",
          message: "Ingresso válido! Entrada autorizada.",
          ticketData: {
            eventTitle: details?.eventTitle || "Evento",
            ticketType: details?.ticketType || "Geral",
            holderName: details?.holderEmail || user?.email || "",
            eventDate: details?.eventDate || new Date().toLocaleDateString(),
            eventTime: details?.eventTime || "",
          },
        };
        setValidationResult(result);
        return result;
      } else {
        const msg =
          data?.message ||
          "Código do ingresso inválido. Verifique e tente novamente.";
        const status = data?.status === "used" ? "error" : "invalid";
        const result: ValidationResultState = { status, message: msg };
        setValidationResult(result);
        return result;
      }
    } catch (backendErr) {
      clearTimeout(timeoutId);
      const timedOut =
        backendErr instanceof DOMException && backendErr.name === "AbortError";
      if (timedOut) {
        const result: ValidationResultState = {
          status: "error",
          message: "Tempo limite excedido. Verifique a conexão e tente novamente.",
        };
        setValidationResult(result);
        setIsValidating(false);
        return result;
      }
      logger.error("Erro ao validar no backend", backendErr as Error);

      // Fallback para modo offline/DEV
      if (import.meta.env.DEV) {
        const offlineTicket =
          TestDataService.validateOfflineTicket(codeToValidate);
        if (offlineTicket) {
          const result: ValidationResultState = {
            status: offlineTicket.status === "used" ? "error" : "success",
            message:
              offlineTicket.status === "used"
                ? "Este ingresso já foi utilizado."
                : "Ingresso válido! Entrada autorizada.",
            ticketData: {
              eventTitle: offlineTicket.eventTitle,
              ticketType: offlineTicket.ticketType,
              holderName: offlineTicket.userEmail,
              eventDate: offlineTicket.eventDate,
              eventTime: offlineTicket.eventTime || "",
            },
          };
          setValidationResult(result);
          return result;
        }
      }

      const result: ValidationResultState = {
        status: "error",
        message: "Erro ao validar ingresso no backend. Tente novamente.",
      };
      setValidationResult(result);
      return result;
    } finally {
      clearTimeout(timeoutId);
      setIsValidating(false);
    }
  };

  const resetValidation = () => {
    setValidationResult({ status: null, message: "" });
  };

  return {
    validateTicket,
    validationResult,
    isValidating,
    resetValidation,
  };
}
