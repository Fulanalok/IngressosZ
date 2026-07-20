/* eslint-disable require-jsdoc, max-len */
import { createHash } from "node:crypto";

export const WEBHOOK_OUTCOMES = [
  "processed",
  "refund_required_oversold",
  "refund_required_duplicate",
  "refund_required_invalid_session",
  "refund_required_amount_mismatch",
  "ignored_not_approved",
] as const;

export type WebhookOutcome = (typeof WEBHOOK_OUTCOMES)[number];

export interface ProviderPayment {
  id?: string | number | null;
  status?: string | null;
  transaction_amount?: number | null;
  currency_id?: string | null;
  external_reference?: string | null;
  metadata?: unknown;
}

export interface PersistedPaymentSession {
  eventId?: unknown;
  userId?: unknown;
  userEmail?: unknown;
  ticketType?: unknown;
  quantity?: unknown;
  unitPrice?: unknown;
  totalAmount?: unknown;
  paymentMethod?: unknown;
  provider?: unknown;
  providerState?: unknown;
  status?: unknown;
  paymentId?: unknown;
  purchaseId?: unknown;
  refundReason?: unknown;
}

export type CompatibilityResult =
  | { kind: "valid" }
  | { kind: "idempotent"; purchaseId?: string }
  | {
    kind: "permanent";
    outcome: Exclude<WebhookOutcome, "processed" | "ignored_not_approved">;
    reason: string;
  };

export interface SessionReference {
  paymentSessionId?: string;
  reason?: "missing_reference" | "divergent_reference";
}

export interface FulfillmentCommand {
  paymentId: string;
  providerPayment: ProviderPayment;
  sessionReference: SessionReference;
  nowMillis: number;
  purchaseId: string;
  ticketId(index: number): string;
  signTicket(input: TicketSigningInput): string;
}

export interface TicketSigningInput {
  ticketId: string;
  eventId: string;
  userId: string;
  issuedAtMillis: number;
  eventDate?: string;
  eventTime?: string;
}

export interface FulfillmentResult {
  outcome: WebhookOutcome;
  purchaseId?: string;
  newlyProcessed: boolean;
  email?: {
    purchaseId: string;
    userId: string;
    eventId: string;
    ticketsCount: number;
  };
}

export interface PaymentFulfillmentRepository {
  fulfill(command: FulfillmentCommand): Promise<FulfillmentResult>;
}

export interface FulfillmentLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
  error(message: string, data?: Record<string, unknown>): void;
}

export interface PaymentFulfillmentDependencies {
  repository: PaymentFulfillmentRepository;
  now(): number;
  createPurchaseId(paymentId: string): string;
  createTicketId(paymentId: string, index: number): string;
  signTicket(input: TicketSigningInput): string;
  sendPurchaseEmail(
    purchaseId: string,
    details: {
      userId: string;
      eventId: string;
      ticketsCount: number;
    }
  ): Promise<void>;
  logger: FulfillmentLogger;
}

function trimmedString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed || undefined;
}

export function normalizePaymentId(value: unknown): string | undefined {
  if (typeof value !== "string" && typeof value !== "number") {
    return undefined;
  }
  const normalized = String(value).trim();
  if (!normalized || normalized.includes("/")) return undefined;
  return normalized;
}

export function extractPaymentSessionId(
  payment: Pick<ProviderPayment, "external_reference" | "metadata">
): SessionReference {
  const externalReference = trimmedString(payment.external_reference);
  const metadata = payment.metadata && typeof payment.metadata === "object" &&
    !Array.isArray(payment.metadata) ?
    payment.metadata as Record<string, unknown> : {};
  const currentMetadata = trimmedString(metadata.paymentSessionId);
  const legacyMetadata = trimmedString(metadata.payment_session_id);
  const metadataReference = currentMetadata ?? legacyMetadata;

  const references = [
    externalReference,
    currentMetadata,
    legacyMetadata,
  ].filter((value): value is string => Boolean(value));
  if (!references.length) return { reason: "missing_reference" };
  if (references.some((value) => value !== references[0])) {
    return { reason: "divergent_reference" };
  }
  return { paymentSessionId: externalReference ?? metadataReference };
}

export function moneyToCents(value: unknown): number | undefined {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    return undefined;
  }
  const scaled = value * 100;
  const cents = Math.round(scaled);
  if (Math.abs(scaled - cents) > 1e-6) return undefined;
  if (!Number.isSafeInteger(cents)) return undefined;
  return cents;
}

export function isApprovedProviderPayment(payment: ProviderPayment) {
  return payment.status === "approved";
}

// This pure decision table intentionally enumerates permanent incompatibilities.
// eslint-disable-next-line complexity
export function classifyPaymentCompatibility(input: {
  paymentId: string;
  payment: ProviderPayment;
  session: PersistedPaymentSession;
  eventExists: boolean;
}): CompatibilityResult {
  const { paymentId, payment, session } = input;
  const persistedPaymentId = normalizePaymentId(session.paymentId);
  if (session.status === "approved") {
    if (persistedPaymentId === paymentId) {
      return {
        kind: "idempotent",
        purchaseId: trimmedString(session.purchaseId),
      };
    }
    return {
      kind: "permanent",
      outcome: "refund_required_duplicate",
      reason: "session_already_approved",
    };
  }
  if (persistedPaymentId && persistedPaymentId !== paymentId) {
    return {
      kind: "permanent",
      outcome: "refund_required_duplicate",
      reason: "session_already_has_another_payment",
    };
  }

  const unitPriceInCents = moneyToCents(session.unitPrice);
  const totalInCents = moneyToCents(session.totalAmount);
  const validSession = Boolean(
    trimmedString(session.eventId) &&
    trimmedString(session.userId) &&
    trimmedString(session.userEmail) &&
    ["standard", "vip", "premium"].includes(String(session.ticketType)) &&
    Number.isSafeInteger(session.quantity) &&
    Number(session.quantity) > 0 &&
    unitPriceInCents !== undefined &&
    totalInCents !== undefined &&
    totalInCents === unitPriceInCents * Number(session.quantity) &&
    (session.paymentMethod === "checkout" || session.paymentMethod === "pix") &&
    session.provider === "mercadopago"
  );
  if (normalizePaymentId(payment.id) !== paymentId) {
    return {
      kind: "permanent",
      outcome: "refund_required_invalid_session",
      reason: "provider_payment_id_mismatch",
    };
  }
  if (!validSession) {
    return {
      kind: "permanent",
      outcome: "refund_required_invalid_session",
      reason: "invalid_session_data",
    };
  }
  if (!["created", "creating", "failed"].includes(String(session.providerState))) {
    return {
      kind: "permanent",
      outcome: "refund_required_invalid_session",
      reason: "invalid_provider_state",
    };
  }
  if (payment.currency_id !== "BRL") {
    return {
      kind: "permanent",
      outcome: "refund_required_invalid_session",
      reason: "currency_mismatch",
    };
  }
  if (
    moneyToCents(payment.transaction_amount) === undefined ||
    moneyToCents(payment.transaction_amount) !== totalInCents
  ) {
    return {
      kind: "permanent",
      outcome: "refund_required_amount_mismatch",
      reason: "amount_mismatch",
    };
  }
  if (!input.eventExists) {
    return {
      kind: "permanent",
      outcome: "refund_required_invalid_session",
      reason: "event_not_found",
    };
  }
  return { kind: "valid" };
}

export function stableWebhookDocumentId(prefix: string, value: string) {
  return `${prefix}-${createHash("sha256").update(value).digest("hex")}`;
}

export async function processProviderPayment(
  requestedPaymentId: string,
  providerPayment: ProviderPayment,
  dependencies: PaymentFulfillmentDependencies
): Promise<FulfillmentResult> {
  const paymentId = normalizePaymentId(requestedPaymentId);
  if (!paymentId) throw new Error("Payment ID invalido.");

  const command: FulfillmentCommand = {
    paymentId,
    providerPayment,
    sessionReference: extractPaymentSessionId(providerPayment),
    nowMillis: dependencies.now(),
    purchaseId: dependencies.createPurchaseId(paymentId),
    ticketId: (index) => dependencies.createTicketId(paymentId, index),
    signTicket: dependencies.signTicket,
  };
  const result = await dependencies.repository.fulfill(command);

  if (result.newlyProcessed && result.email) {
    try {
      await dependencies.sendPurchaseEmail(
        result.email.purchaseId,
        result.email
      );
    } catch (error) {
      dependencies.logger.error("Falha no email pos-fulfillment.", {
        paymentId,
        purchaseId: result.email.purchaseId,
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
  return result;
}
