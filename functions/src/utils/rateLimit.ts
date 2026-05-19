import { FieldValue, getFirestore } from "firebase-admin/firestore";

/**
 * Sliding-window rate limiter backed by Firestore.
 * Returns true if the request is allowed, false if rate-limited.
 * Skipped entirely when running in the local emulator.
 * @param {string} key Unique rate-limit bucket key.
 * @param {number} limitPerMinute Maximum allowed requests per minute.
 */
export async function checkRateLimit(
  key: string,
  limitPerMinute: number
): Promise<boolean> {
  if (process.env.FUNCTIONS_EMULATOR === "true") return true;
  const now = Date.now();
  const windowMs = 60_000;
  const ref = getFirestore()
    .collection("rateLimits")
    .doc(key.replace(/[/\\]/g, "_"));
  try {
    return await getFirestore().runTransaction(async (txn) => {
      const snap = await txn.get(ref);
      const data = snap.data() as
        | { count?: number; windowStart?: number }
        | undefined;
      if (!data || now - (data.windowStart ?? 0) > windowMs) {
        txn.set(ref, { count: 1, windowStart: now });
        return true;
      }
      if ((data.count ?? 0) >= limitPerMinute) {
        return false;
      }
      txn.update(ref, { count: FieldValue.increment(1) });
      return true;
    });
  } catch {
    return true;
  }
}
