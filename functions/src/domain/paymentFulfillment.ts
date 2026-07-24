/* eslint-disable require-jsdoc, max-len */
import { createHash } from "node:crypto";
import { MAX_PURCHASE_QUANTITY } from "./purchaseLimits.js";

export const WEBHOOK_OUTCOMES = [
  "processed",
  "refund_required_oversold",
  "refund_required_duplicate",
  "refund_required_invalid_session",
  "refund_required_amount_mismatch",
  "ignored_not_approved",
] as const;

export type WebhookOutcome = (typeof WEBHOOK_OUTCOMES)[number];

const TERMINAL_WEBHOOK_OUTCOMES = new Set<WebhookOutcome>([
  "processed",
  "refund_required_oversold",
  "refund_required_duplicate",
  "refund_required_invalid_session",
  "refund_required_amount_mismatch",
]);

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
  expiresAt?: unknown;
  expiredAt?: unknown;
  expirationReason?: unknown;
  approvedAt?: unknown;
  approvedAfterInitiationExpiry?: unknown;
}

export interface LegacyPurchase {
  id: string;
  status?: unknown;
  eventId?: unknown;
  userId?: unknown;
  paymentSessionId?: unknown;
  approvedAt?: unknown;
  createdAt?: unknown;
  approvedAfterInitiationExpiry?: unknown;
}

export type WebhookGateResult =
  | { kind: "terminal" }
  | { kind: "transient_not_approved" }
  | { kind: "continue" };

export type LegacyPurchaseResult =
  | { kind: "none" }
  | { kind: "processed"; purchaseId: string }
  | { kind: "oversold"; purchaseId: string }
  | {
    kind: "conflict";
    outcome: "refund_required_duplicate" |
      "refund_required_invalid_session" |
      "refund_required_amount_mismatch";
    reason: string;
  };

export type CompatibilityResult =
  | { kind: "valid" }
  | { kind: "idempotent"; purchaseId?: string }
  | {
    kind: "permanent";
    outcome: Exclude<WebhookOutcome, "processed" | "ignored_not_approved">;
    reason: string;
  };

export type FulfillmentSessionStatusResult =
  | { kind: "valid" }
  | {
    kind: "permanent";
    outcome: "refund_required_invalid_session";
    reason: "expired_without_provider_attempt" | "invalid_session_status";
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

export function ticketExpirySeconds(
  issuedAtMillis: number,
  eventDate?: unknown,
  eventTime?: unknown
) {
  if (typeof eventDate !== "string" || !eventDate) {
    return 90 * 24 * 60 * 60;
  }
  const defaultEnd = new Date(`${eventDate}T23:59:00`);
  if (Number.isNaN(defaultEnd.getTime())) {
    return 90 * 24 * 60 * 60;
  }
  const requestedEnd = typeof eventTime === "string" && eventTime ?
    new Date(`${eventDate}T${eventTime}:00`) : defaultEnd;
  const end = Number.isNaN(requestedEnd.getTime()) ? defaultEnd : requestedEnd;
  end.setDate(end.getDate() + 1);
  return Math.max(
    Math.floor((end.getTime() - issuedAtMillis) / 1000),
    86400
  );
}

export function isApprovedProviderPayment(payment: ProviderPayment) {
  return payment.status === "approved";
}

export function classifyFulfillmentSessionStatus(
  session: Pick<PersistedPaymentSession, "status" | "providerState">
): FulfillmentSessionStatusResult {
  if (session.status === "pending" || session.status === "approved") {
    return { kind: "valid" };
  }
  if (session.status === "expired") {
    if (["created", "creating", "failed"].includes(
      String(session.providerState)
    )) {
      return { kind: "valid" };
    }
    return {
      kind: "permanent",
      outcome: "refund_required_invalid_session",
      reason: "expired_without_provider_attempt",
    };
  }
  return {
    kind: "permanent",
    outcome: "refund_required_invalid_session",
    reason: "invalid_session_status",
  };
}

export function classifyWebhookGate(
  existingOutcome: unknown,
  payment: ProviderPayment
): WebhookGateResult {
  if (
    typeof existingOutcome === "string" &&
    TERMINAL_WEBHOOK_OUTCOMES.has(existingOutcome as WebhookOutcome)
  ) {
    return { kind: "terminal" };
  }
  if (!isApprovedProviderPayment(payment)) {
    return { kind: "transient_not_approved" };
  }
  return { kind: "continue" };
}

// eslint-disable-next-line complexity
export function classifyLegacyPurchases(input: {
  paymentId: string;
  payment: ProviderPayment;
  paymentSessionId: string;
  session: PersistedPaymentSession;
  purchases: LegacyPurchase[];
}): LegacyPurchaseResult {
  if (!input.purchases.length) return { kind: "none" };
  if (input.purchases.length > 1) {
    return {
      kind: "conflict",
      outcome: "refund_required_duplicate",
      reason: "multiple_legacy_purchases",
    };
  }

  const purchase = input.purchases[0];
  if (normalizePaymentId(input.payment.id) !== input.paymentId) {
    return {
      kind: "conflict",
      outcome: "refund_required_invalid_session",
      reason: "provider_payment_id_mismatch",
    };
  }
  if (input.payment.currency_id !== "BRL") {
    return {
      kind: "conflict",
      outcome: "refund_required_invalid_session",
      reason: "currency_mismatch",
    };
  }
  const providerAmountInCents = moneyToCents(input.payment.transaction_amount);
  const sessionAmountInCents = moneyToCents(input.session.totalAmount);
  if (
    providerAmountInCents === undefined ||
    sessionAmountInCents === undefined ||
    providerAmountInCents !== sessionAmountInCents
  ) {
    return {
      kind: "conflict",
      outcome: "refund_required_amount_mismatch",
      reason: "amount_mismatch",
    };
  }
  const persistedPaymentId = normalizePaymentId(input.session.paymentId);
  if (persistedPaymentId && persistedPaymentId !== input.paymentId) {
    return {
      kind: "conflict",
      outcome: "refund_required_duplicate",
      reason: "session_already_has_another_payment",
    };
  }
  const identityMatches =
    trimmedString(purchase.eventId) === trimmedString(input.session.eventId) &&
    trimmedString(purchase.userId) === trimmedString(input.session.userId);
  const purchaseSessionId = trimmedString(purchase.paymentSessionId);
  const sessionMatches = !purchaseSessionId ||
    purchaseSessionId === input.paymentSessionId;
  if (!identityMatches || !sessionMatches) {
    return {
      kind: "conflict",
      outcome: "refund_required_invalid_session",
      reason: "legacy_purchase_identity_mismatch",
    };
  }
  if (purchase.status === "approved") {
    if (input.session.status !== "pending" && input.session.status !== "expired") {
      return {
        kind: "conflict",
        outcome: "refund_required_invalid_session",
        reason: "legacy_approved_session_status_invalid",
      };
    }
    return { kind: "processed", purchaseId: purchase.id };
  }
  if (
    purchase.status === "refunded_oversold" ||
    purchase.status === "refund_required_oversold"
  ) {
    if (!["pending", "expired", "refund_required"].includes(
      String(input.session.status)
    )) {
      return {
        kind: "conflict",
        outcome: "refund_required_invalid_session",
        reason: "legacy_oversold_session_status_invalid",
      };
    }
    return { kind: "oversold", purchaseId: purchase.id };
  }
  return {
    kind: "conflict",
    outcome: "refund_required_invalid_session",
    reason: "legacy_purchase_status_invalid",
  };
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
  const statusCompatibility = classifyFulfillmentSessionStatus(session);
  if (statusCompatibility.kind === "permanent") {
    return statusCompatibility;
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
    Number(session.quantity) <= MAX_PURCHASE_QUANTITY &&
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
