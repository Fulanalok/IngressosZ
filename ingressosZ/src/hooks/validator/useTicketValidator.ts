import { useAuth } from "@/hooks/auth/useAuth";
import { appCheck } from "@/firebaseConfig";
import { getToken } from "firebase/app-check";
import type { User } from "firebase/auth";
import { useState } from "react";
import { logger } from "../../services/logger";
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

interface BackendTicket {
  eventTitle?: string;
  ticketType?: string;
  holderEmail?: string;
  eventDate?: string;
  eventTime?: string;
}

interface BackendValidationResponse {
  success?: boolean;
  message?: string;
  status?: string;
  ticket?: BackendTicket;
}

type OfflineTicket = NonNullable<
  ReturnType<typeof TestDataService.validateOfflineTicket>
>;

const FUNCTIONS_URL = "/functions";
const VALIDATION_TIMEOUT_MS = 10_000;

async function getAuthHeader(
  user: User | null | undefined
): Promise<Record<string, string>> {
  const token = user?.getIdToken ? await user.getIdToken(false) : undefined;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function getAppCheckHeader(): Promise<Record<string, string>> {
  if (!appCheck) return {};

  try {
    const appCheckToken = await getToken(appCheck, false);
    return { "X-Firebase-AppCheck": appCheckToken.token };
  } catch (error) {
    logger.warn("Falha ao obter App Check para validação", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return {};
  }
}

async function buildValidationHeaders(user: User | null | undefined) {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  Object.assign(headers, await getAuthHeader(user));
  Object.assign(headers, await getAppCheckHeader());
  return headers;
}

function requestOptions(
  qrCode: string,
  headers: Record<string, string>,
  signal: AbortSignal
) {
  return {
    method: "POST",
    headers,
    body: JSON.stringify({ qrCode }),
    signal,
  };
}

function postValidation(
  qrCode: string,
  headers: Record<string, string>,
  signal: AbortSignal
) {
  return fetch(
    `${FUNCTIONS_URL}/validateTicket`,
    requestOptions(qrCode, headers, signal)
  );
}

async function retryWithFreshToken(
  response: Response,
  user: User | null | undefined,
  qrCode: string,
  headers: Record<string, string>,
  signal: AbortSignal
) {
  if (response.status !== 401 || !user) return response;

  const freshToken = await user.getIdToken(true);
  headers.Authorization = `Bearer ${freshToken}`;
  return postValidation(qrCode, headers, signal);
}

function buildSuccessResult(
  ticket: BackendTicket | undefined,
  fallbackEmail: string
): ValidationResultState {
  const ticketData = buildSuccessTicketData(ticket, fallbackEmail);

  return {
    status: "success",
    message: "Ingresso válido! Entrada autorizada.",
    ticketData,
  };
}

function getFieldValue(value: string | undefined, fallback: string) {
  return value || fallback;
}

function buildSuccessTicketData(
  ticket: BackendTicket | undefined,
  fallbackEmail: string
): TicketData {
  return {
    eventTitle: getFieldValue(ticket?.eventTitle, "Evento"),
    ticketType: getFieldValue(ticket?.ticketType, "Geral"),
    holderName: getFieldValue(ticket?.holderEmail, fallbackEmail),
    eventDate: getFieldValue(ticket?.eventDate, new Date().toLocaleDateString()),
    eventTime: getFieldValue(ticket?.eventTime, ""),
  };
}

function buildBackendResult(
  response: Response,
  data: BackendValidationResponse,
  fallbackEmail: string
): ValidationResultState {
  if (response.ok && data?.success) {
    return buildSuccessResult(data.ticket, fallbackEmail);
  }

  return {
    status: data?.status === "used" ? "error" : "invalid",
    message:
      data?.message ||
      "Código do ingresso inválido. Verifique e tente novamente.",
  };
}

function buildOfflineResult(ticket: OfflineTicket): ValidationResultState {
  return {
    status: ticket.status === "used" ? "error" : "success",
    message:
      ticket.status === "used"
        ? "Este ingresso já foi utilizado."
        : "Ingresso válido! Entrada autorizada.",
    ticketData: {
      eventTitle: ticket.eventTitle,
      ticketType: ticket.ticketType,
      holderName: ticket.userEmail,
      eventDate: ticket.eventDate,
      eventTime: ticket.eventTime || "",
    },
  };
}

function getOfflineValidationResult(qrCode: string) {
  if (!import.meta.env.DEV) return null;

  const offlineTicket = TestDataService.validateOfflineTicket(qrCode);
  return offlineTicket ? buildOfflineResult(offlineTicket) : null;
}

function isTimeoutError(error: unknown) {
  return error instanceof DOMException && error.name === "AbortError";
}

function buildTimeoutResult(): ValidationResultState {
  return {
    status: "error",
    message: "Tempo limite excedido. Verifique a conexão e tente novamente.",
  };
}

function buildBackendErrorResult(): ValidationResultState {
  return {
    status: "error",
    message: "Erro ao validar ingresso no backend. Tente novamente.",
  };
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
    const timeoutId = setTimeout(() => controller.abort(), VALIDATION_TIMEOUT_MS);

    try {
      const headers = await buildValidationHeaders(user);
      const response = await postValidation(
        codeToValidate,
        headers,
        controller.signal
      );
      const finalResponse = await retryWithFreshToken(
        response,
        user,
        codeToValidate,
        headers,
        controller.signal
      );
      const data = (await finalResponse.json()) as BackendValidationResponse;
      const result = buildBackendResult(finalResponse, data, user?.email || "");
      setValidationResult(result);
      return result;
    } catch (backendErr) {
      const result = handleValidationError(backendErr, codeToValidate);
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

function handleValidationError(error: unknown, qrCode: string) {
  if (isTimeoutError(error)) return buildTimeoutResult();

  logger.error("Erro ao validar no backend", error as Error);
  return getOfflineValidationResult(qrCode) ?? buildBackendErrorResult();
}
