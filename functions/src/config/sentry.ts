import * as Sentry from "@sentry/node";
import { sentryDsn } from "./params.js";

/**
 * Initializes Sentry with redaction for request and payment metadata.
 */
export function initSentry(): void {
  Sentry.init({
    dsn: sentryDsn.value() || process.env.SENTRY_DSN,
    integrations: [],
    tracesSampleRate: 1.0,
    profilesSampleRate: 1.0,
    beforeSend(event) {
      if (event.request?.cookies) delete event.request.cookies;
      if (event.request?.headers) {
        const h = event.request.headers as Record<string, string>;
        delete h["authorization"];
        delete h["x-signature"];
        delete h["cookie"];
      }
      if (event.extra) {
        const extra = event.extra as Record<string, unknown>;
        if (typeof extra.userEmail === "string") {
          extra.userEmail = "[redacted]";
        }
        if (typeof extra.paymentId === "string") {
          extra.paymentId = "[redacted]";
        }
      }
      return event;
    },
  });
}
