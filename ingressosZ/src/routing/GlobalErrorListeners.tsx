import { logger } from "@/services/logger";
import { useEffect } from "react";

export function GlobalErrorListeners() {
  useEffect(() => {
    const onError = (e: ErrorEvent) => {
      logger.error("Window Error", e.error, {
        type: "window-error",
        message: e.message,
        filename: e.filename,
        lineno: e.lineno,
        colno: e.colno,
      });
    };

    const onRejection = (e: PromiseRejectionEvent) => {
      logger.error("Unhandled Rejection", e.reason, {
        type: "unhandled-rejection",
      });
    };

    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);

    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  return null;
}
