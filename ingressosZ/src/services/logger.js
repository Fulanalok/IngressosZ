import { auth, functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";
/**
 * Envia um log de erro do cliente para o backend de forma unificada.
 * Utiliza Firebase Functions Callable para maior segurança e facilidade de integração.
 */
export async function postClientError(details) {
    try {
        const logFunction = httpsCallable(functions, "logClientError");
        const payload = {
            ...details,
            route: typeof window !== "undefined" && window.location
                ? window.location.pathname
                : details.route,
            ua: typeof navigator !== "undefined" ? navigator.userAgent : details.ua,
            ts: typeof details.ts === "number" ? details.ts : Date.now(),
            uid: auth.currentUser?.uid || "anonymous",
        };
        // Chamada assíncrona sem bloquear o fluxo principal
        logFunction(payload).catch(err => {
            // Falha silenciosa no envio do log para não afetar a UX
            console.warn("Falha ao enviar log para o backend:", err);
        });
        return { ok: true, status: 200 };
    }
    catch (error) {
        console.error("Erro ao processar postClientError:", error);
        return { ok: false, status: 0 };
    }
}
/**
 * Atalhos para logs de diferentes níveis
 */
export const logger = {
    error: (message, error, extra) => {
        console.error(message, error);
        postClientError({
            level: "error",
            message,
            error: error instanceof Error ? {
                name: error.name,
                message: error.message,
                stack: error.stack
            } : error,
            ...extra
        });
    },
    warn: (message, extra) => {
        console.warn(message);
        postClientError({
            level: "warn",
            message,
            ...extra
        });
    },
    info: (message, extra) => {
        console.info(message);
        postClientError({
            level: "info",
            message,
            ...extra
        });
    }
};
