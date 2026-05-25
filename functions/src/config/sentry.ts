import * as Sentry from "@sentry/node";

const parseSampleRate = (value: string | undefined, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 0 || parsed > 1) return fallback;
  return parsed;
};

/**
 * Initializes Sentry with redaction for request and payment metadata.
 */
export function initSentry(): void {
  const dsn = process.env.SENTRY_DSN;
  if (!dsn) return;

  Sentry.init({
    dsn,
    integrations: [],
    sendDefaultPii: false,
    tracesSampleRate: parseSampleRate(
      process.env.SENTRY_TRACES_SAMPLE_RATE,
      0.1
    ),
    profilesSampleRate: parseSampleRate(
      process.env.SENTRY_PROFILES_SAMPLE_RATE,
      0
    ),
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        delete h["authorization"];
        delete h["x-signature"];
        delete h["cookie"];
      }
      if (event.user) {
        event.user = event.user.id ? { id: event.user.id } : undefined;
      }
      if (event.extra) {
        const extra = event.extra as Record<string, unknown>;
        if (typeof extra.userEmail === "string") {
          extra.userEmail = "[redacted]";
        }
        if (typeof extra.paymentId === "string") {
          extra.paymentId = "[redacted]";
        }
        if (typeof extra.qrCode === "string") {
          extra.qrCode = "[redacted]";
        }
      }
      return event;
    },
  });
}
