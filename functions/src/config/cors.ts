import cors from "cors";
import { webBaseUrl } from "./params.js";

const webBase = String(webBaseUrl.value() || "").trim();
const allowedOrigins = new Set(
  [
    webBase,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
    "http://localhost:5174",
    "http://127.0.0.1:5174",
  ]
    .filter(Boolean)
    .map((origin) => origin.replace(/\/+$/, ""))
);

export const corsHandler = cors({
  origin: (origin, callback) => {
    if (!origin) {
      callback(null, true);
      return;
    }
    const normalized = origin.replace(/\/+$/, "");
    const isLocalhost =
      /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(normalized);
    if (isLocalhost || allowedOrigins.has(normalized)) {
      callback(null, true);
      return;
    }
    callback(null, false);
  },
});
