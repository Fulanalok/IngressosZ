/* eslint-disable require-jsdoc, max-len */
import {
  Firestore,
  QueryDocumentSnapshot,
  Timestamp,
} from "firebase-admin/firestore";
import {
  PROVIDER_CREATING_LEASE_MS,
  PaymentSessionExpirationDecision,
  classifyPaymentSessionExpiration,
} from "../domain/paymentSessionLifecycle.js";

export interface PaymentSessionMaintenanceLogger {
  info(message: string, data?: Record<string, unknown>): void;
  warn(message: string, data?: Record<string, unknown>): void;
}

export interface PaymentSessionMaintenanceSummary {
  candidatesRead: number;
  expired: number;
  ignoredActiveProviderAttempt: number;
  ignoredProviderCreated: number;
  concurrentConflicts: number;
  invalid: number;
}

export interface PaymentSessionMaintenanceOptions {
  db: Firestore;
  nowMillis: number;
  logger: PaymentSessionMaintenanceLogger;
  pageSize?: number;
  providerCreatingLeaseMs?: number;
  beforeCandidateTransaction?(paymentSessionId: string): Promise<void>;
}

const EXPIRATION_RESULTS = new Set([
  "expire_provider_not_started",
  "expire_provider_attempt_failed",
  "expire_provider_attempt_stale",
]);

function logDecision(
  logger: PaymentSessionMaintenanceLogger,
  paymentSessionId: string,
  providerState: unknown,
  decision: PaymentSessionExpirationDecision
) {
  const data = {
    paymentSessionId,
    providerState: typeof providerState === "string" ? providerState : "invalid",
    result: decision.result,
    ...(decision.expirationReason ? {
      expirationReason: decision.expirationReason,
    } : {}),
  };
  if (decision.result === "invalid_or_not_due") {
    logger.warn("Payment session invalida ou nao elegivel para expiracao.", data);
  } else {
    logger.info("Payment session classificada pela manutencao.", data);
  }
}

// eslint-disable-next-line complexity
export async function expireStalePaymentSessionsInFirestore(
  options: PaymentSessionMaintenanceOptions
): Promise<PaymentSessionMaintenanceSummary> {
  const pageSize = options.pageSize ?? 200;
  const leaseMs = options.providerCreatingLeaseMs ??
    PROVIDER_CREATING_LEASE_MS;
  const summary: PaymentSessionMaintenanceSummary = {
    candidatesRead: 0,
    expired: 0,
    ignoredActiveProviderAttempt: 0,
    ignoredProviderCreated: 0,
    concurrentConflicts: 0,
    invalid: 0,
  };
  let cursor: QueryDocumentSnapshot | undefined;
  let hasMore = true;

  options.logger.warn(
    "Payment sessions legadas sem expiresAt nao participam da consulta principal.",
    { result: "legacy_without_expires_at_ignored" }
  );

  while (hasMore) {
    let query = options.db.collection("paymentSessions")
      .where("status", "==", "pending")
      .where("providerState", "in", ["ready", "failed", "creating"])
      .where("expiresAt", "<=", Timestamp.fromMillis(options.nowMillis))
      .orderBy("expiresAt", "asc")
      .limit(pageSize);
    if (cursor) query = query.startAfter(cursor);

    const page = await query.get();
    if (page.empty) break;
    summary.candidatesRead += page.size;

    for (const candidate of page.docs) {
      await options.beforeCandidateTransaction?.(candidate.id);
      const classified = await options.db.runTransaction(async (transaction) => {
        const current = await transaction.get(candidate.ref);
        if (!current.exists) {
          return {
            decision: {
              result: "invalid_or_not_due",
            } as PaymentSessionExpirationDecision,
            providerState: "missing",
          };
        }
        const data = current.data() ?? {};
        const currentDecision = classifyPaymentSessionExpiration({
          session: data,
          nowMillis: options.nowMillis,
          providerCreatingLeaseMs: leaseMs,
        });
        if (
          EXPIRATION_RESULTS.has(currentDecision.result) &&
          currentDecision.expirationReason
        ) {
          transaction.update(current.ref, {
            status: "expired",
            expirationReason: currentDecision.expirationReason,
            expiredAt: Timestamp.fromMillis(options.nowMillis),
            updatedAt: Timestamp.fromMillis(options.nowMillis),
          });
        }
        return {
          decision: currentDecision,
          providerState: data.providerState,
        };
      });

      const { decision, providerState } = classified;
      logDecision(options.logger, candidate.id, providerState, decision);
      if (EXPIRATION_RESULTS.has(decision.result)) {
        summary.expired += 1;
      } else if (decision.result === "keep_active_provider_attempt") {
        summary.ignoredActiveProviderAttempt += 1;
      } else if (decision.result === "keep_provider_created") {
        summary.ignoredProviderCreated += 1;
      } else if (decision.result === "keep_terminal") {
        summary.concurrentConflicts += 1;
      } else {
        summary.invalid += 1;
      }
    }

    cursor = page.docs[page.docs.length - 1];
    hasMore = page.size === pageSize;
  }

  options.logger.info("Manutencao de payment sessions concluida.", {
    ...summary,
  });
  return summary;
}
