/* eslint-disable require-jsdoc */

export const PROVIDER_CREATING_LEASE_MS = 2 * 60 * 1000;

export type PaymentSessionExpirationResult =
  | "expire_provider_not_started"
  | "expire_provider_attempt_failed"
  | "expire_provider_attempt_stale"
  | "keep_active_provider_attempt"
  | "keep_provider_created"
  | "keep_terminal"
  | "invalid_or_not_due";

export type PaymentSessionExpirationReason =
  | "provider_not_started"
  | "provider_attempt_failed"
  | "provider_attempt_stale";

export interface PaymentSessionExpirationDecision {
  result: PaymentSessionExpirationResult;
  expirationReason?: PaymentSessionExpirationReason;
}

export interface PaymentSessionLifecycleData {
  status?: unknown;
  providerState?: unknown;
  expiresAt?: unknown;
  providerStartedAt?: unknown;
}

export function timestampToMillis(value: unknown): number | undefined {
  if (value instanceof Date) {
    const millis = value.getTime();
    return Number.isFinite(millis) ? millis : undefined;
  }
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    const millis = (value as { toMillis(): number }).toMillis();
    return Number.isFinite(millis) ? millis : undefined;
  }
  return undefined;
}

// eslint-disable-next-line complexity
export function classifyPaymentSessionExpiration(input: {
  session: PaymentSessionLifecycleData;
  nowMillis: number;
  providerCreatingLeaseMs?: number;
}): PaymentSessionExpirationDecision {
  const { session, nowMillis } = input;
  const leaseMs = input.providerCreatingLeaseMs ??
    PROVIDER_CREATING_LEASE_MS;

  if (["approved", "refund_required", "expired"].includes(
    String(session.status)
  )) {
    return { result: "keep_terminal" };
  }
  if (session.status !== "pending" || !Number.isFinite(nowMillis)) {
    return { result: "invalid_or_not_due" };
  }
  if (session.providerState === "created") {
    return { result: "keep_provider_created" };
  }

  const expiresAtMillis = timestampToMillis(session.expiresAt);
  if (expiresAtMillis === undefined || expiresAtMillis > nowMillis) {
    return { result: "invalid_or_not_due" };
  }
  if (session.providerState === "ready") {
    return {
      result: "expire_provider_not_started",
      expirationReason: "provider_not_started",
    };
  }
  if (session.providerState === "failed") {
    return {
      result: "expire_provider_attempt_failed",
      expirationReason: "provider_attempt_failed",
    };
  }
  if (session.providerState !== "creating") {
    return { result: "invalid_or_not_due" };
  }

  const providerStartedAtMillis = timestampToMillis(session.providerStartedAt);
  if (providerStartedAtMillis === undefined) {
    return { result: "invalid_or_not_due" };
  }
  if (providerStartedAtMillis > nowMillis - leaseMs) {
    return { result: "keep_active_provider_attempt" };
  }
  return {
    result: "expire_provider_attempt_stale",
    expirationReason: "provider_attempt_stale",
  };
}

export function isApprovedAfterInitiationExpiry(
  session: Pick<PaymentSessionLifecycleData, "status" | "expiresAt">,
  nowMillis: number
) {
  if (session.status === "expired") return true;
  const expiresAtMillis = timestampToMillis(session.expiresAt);
  return expiresAtMillis !== undefined && expiresAtMillis < nowMillis;
}
