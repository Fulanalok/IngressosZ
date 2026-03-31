import { useState } from "react";
import { TestDataService } from "../../services/testDataService";
import { useAuth } from "../useAuth";
export function useTicketValidator() {
    const { user } = useAuth();
    const [isValidating, setIsValidating] = useState(false);
    const [validationResult, setValidationResult] = useState({
        status: null,
        message: "",
    });
    const validateTicket = async (code) => {
        const codeToValidate = code.trim();
        setIsValidating(true);
        setValidationResult({ status: null, message: "" });
        try {
            const functionsUrl = `/functions`;
            const token = user && user.getIdToken ? await user.getIdToken() : undefined;
            const headers = {
                "Content-Type": "application/json",
            };
            if (token)
                headers["Authorization"] = `Bearer ${token}`;
            const resp = await fetch(`${functionsUrl}/validateTicket`, {
                method: "POST",
                headers,
                body: JSON.stringify({ qrCode: codeToValidate }),
            });
            const data = await resp.json();
            if (resp.ok && data?.success) {
                const details = data?.ticket;
                const result = {
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
            }
            else {
                const msg = data?.message ||
                    "Código do ingresso inválido. Verifique e tente novamente.";
                const status = data?.status === "used" ? "error" : "invalid";
                const result = { status, message: msg };
                setValidationResult(result);
                return result;
            }
        }
        catch (backendErr) {
            console.warn("Erro ao validar no backend:", backendErr);
            // Fallback para modo offline/DEV
            if (import.meta.env.DEV) {
                const offlineTicket = TestDataService.validateOfflineTicket(codeToValidate);
                if (offlineTicket) {
                    const result = {
                        status: offlineTicket.status === "used" ? "error" : "success",
                        message: offlineTicket.status === "used"
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
            const result = {
                status: "error",
                message: "Erro ao validar ingresso no backend. Tente novamente.",
            };
            setValidationResult(result);
            return result;
        }
        finally {
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
