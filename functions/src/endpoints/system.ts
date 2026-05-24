import * as logger from "firebase-functions/logger";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { corsHandler } from "../config/cors.js";
import { recaptchaV2Secret } from "../config/params.js";

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

export const logClientError = onCall((request) => {
  const payload = request.data as Record<string, unknown>;
  const uid = request.auth?.uid || payload.uid || "anonymous";

  logger.warn("ClientError", {
    ...payload,
    uid,
    ip: request.rawRequest.ip,
  });

  return { success: true };
});

export const verifyRecaptchaV2 = onCall(
  { secrets: [recaptchaV2Secret], cors: true },
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
