import { useState } from "react";
import { useAuth } from "../useAuth";
import { postClientError } from "../../services/logger";
import { TestDataService } from "../../services/testDataService";

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

    try {
      const functionsUrl = `/functions`;
      const token =
        user && user.getIdToken ? await user.getIdToken() : undefined;
      const headers: Record<string, string> = {
        "Content-Type": "application/json",
      };
      if (token) headers["Authorization"] = `Bearer ${token}`;

      const resp = await fetch(`${functionsUrl}/validateTicket`, {
        method: "POST",
        headers,
        body: JSON.stringify({ qrCode: codeToValidate }),
      });
      const data = await resp.json();

      if (resp.ok && data?.success) {
        const details = data?.ticket;
        setValidationResult({
          status: "success",
          message: "Ingresso válido! Entrada autorizada.",
          ticketData: {
            eventTitle: details?.eventTitle || "Evento",
            ticketType: details?.ticketType || "Geral",
            holderName: details?.holderEmail || user?.email || "",
            eventDate: details?.eventDate || new Date().toLocaleDateString(),
            eventTime: details?.eventTime || "",
          },
        });
      } else {
        const msg =
          data?.message ||
          "Código do ingresso inválido. Verifique e tente novamente.";
        const status = data?.status === "used" ? "error" : "invalid";
        setValidationResult({ status, message: msg });
      }
    } catch (backendErr) {
      console.warn("⚠️ Erro ao validar no backend:", backendErr);

      // Fallback para modo offline/DEV
      if (import.meta.env.DEV) {
        const offlineTicket =
          TestDataService.validateOfflineTicket(codeToValidate);
        if (offlineTicket) {
          setValidationResult({
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
          });
          return;
        }
      }

      setValidationResult({
        status: "error",
        message: "Erro ao validar ingresso no backend. Tente novamente.",
      });

      void postClientError({
        type: "validate-backend-error",
        message:
          backendErr instanceof Error
            ? backendErr.message
            : String(backendErr),
        route: window.location.pathname,
        ua: navigator.userAgent,
        qrCode: codeToValidate,
        ts: Date.now(),
      });
    } finally {
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
