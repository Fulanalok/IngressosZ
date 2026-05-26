import { defineSecret, defineString } from "firebase-functions/params";

export const mercadopagoAccessToken = defineSecret("MP_ACCESS_TOKEN");
export const mpWebhookSecret = defineSecret("MP_WEBHOOK_SECRET");
export const jwtSecret = defineSecret("JWT_SECRET");
export const smtpEmail = defineSecret("SMTP_EMAIL");
export const smtpPassword = defineSecret("SMTP_PASSWORD");
export const recaptchaV2Secret = defineSecret("RECAPTCHA_V2_SECRET");
export const smtpHost = defineString("SMTP_HOST", {
  default: "smtp.gmail.com",
});
export const smtpPort = defineString("SMTP_PORT", { default: "465" });
export const webBaseUrl = defineString("WEB_BASE_URL", {
  default: "https://<your-project>.web.app",
});
