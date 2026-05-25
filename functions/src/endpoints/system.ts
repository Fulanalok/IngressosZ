import * as logger from "firebase-functions/logger";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { corsHandler } from "../config/cors.js";
import { recaptchaV2Secret } from "../config/params.js";
import { callableSecurityOptions } from "../config/security.js";
import { sanitizeLogPayload } from "../utils/logging.js";
import { checkRateLimit } from "../utils/rateLimit.js";

export const health = onRequest((req, res) => {
  corsHandler(req, res, () => {
    const firestoreEmulator = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
    const authEmulator = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
    const storageEmulator = Boolean(process.env.FIREBASE_STORAGE_EMULATOR_HOST);
    const emulator = firestoreEmulator || authEmulator || storageEmulator;

    res.status(200).json({
      emulator,
      firestoreEmulator,
      authEmulator,
      storageEmulator,
    });
  });
});

export const logClientError = onCall(
  callableSecurityOptions,
  async (request) => {
    const uid = request.auth?.uid || "anonymous";
    const clientIp = request.rawRequest.ip || "unknown";
    const allowed = await checkRateLimit(`client-error:${uid}:${clientIp}`, 30);
    if (!allowed) {
      throw new HttpsError(
        "resource-exhausted",
        "Muitas tentativas. Aguarde um momento e tente novamente."
      );
    }

    logger.warn("ClientError", {
      uid,
      payload: sanitizeLogPayload(request.data),
    });

    return { success: true };
  }
);

export const verifyRecaptchaV2 = onCall(
  { ...callableSecurityOptions, secrets: [recaptchaV2Secret], cors: true },
  async (request) => {
    const token = (request.data as { token?: string } | null)?.token;
    if (!token || typeof token !== "string") {
      throw new HttpsError("invalid-argument", "Token do reCAPTCHA ausente.");
    }

    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    const testSecret = "6LeIxAcTAAAAAGG-vFI1TnRWxMZNFuojJ4WifJWe";
    const secret = recaptchaV2Secret.value() || (isEmulator ? testSecret : "");
    if (!secret) {
      throw new HttpsError(
        "failed-precondition",
        "RECAPTCHA_V2_SECRET não configurado."
      );
    }

    const body = new URLSearchParams({
      secret,
      response: token,
    });
    const verifyResponse = await fetch(
      "https://www.google.com/recaptcha/api/siteverify",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body,
      }
    );
    const data = (await verifyResponse.json()) as {
      success?: boolean;
      "error-codes"?: string[];
    };

    if (!data.success) {
      throw new HttpsError("permission-denied", "reCAPTCHA inválido.", {
        codes: data["error-codes"] ?? [],
      });
    }

    return { success: true };
  }
);
