import admin from "firebase-admin";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onDocumentCreated } from "firebase-functions/v2/firestore";
import * as nodemailer from "nodemailer";
import {
  smtpEmail,
  smtpHost,
  smtpPassword,
  smtpPort,
  webBaseUrl,
} from "../config/params.js";
export const onTicketCreated = onDocumentCreated(
  { document: "tickets/{ticketId}", secrets: [smtpEmail, smtpPassword] },
  async (event) => {
    const snapshot = event.data;
    if (!snapshot) {
      return;
    }

    const data = snapshot.data() as {
      userId?: string;
      eventId?: string;
      purchaseId?: string;
      purchaseDate?: Timestamp;
      userEmail?: string;
    };

    const updates: Record<string, unknown> = {};

    if (!data.purchaseDate) {
      updates.purchaseDate = FieldValue.serverTimestamp();
    }

    if (!data.userEmail && data.userId) {
      try {
        const userRecord = await admin.auth().getUser(data.userId);
        if (userRecord.email) {
          updates.userEmail = userRecord.email;
        }
      } catch (error) {
        logger.warn("Falha ao buscar email do usuário", error);
      }
    }

    if (Object.keys(updates).length > 0) {
      await snapshot.ref.set(updates, { merge: true });
    }

    if (data.eventId) {
      try {
        await getFirestore()
          .collection("events")
          .doc(data.eventId)
          .update({
            soldTickets: FieldValue.increment(1),
            updatedAt: FieldValue.serverTimestamp(),
          });
      } catch (error) {
        logger.warn("Falha ao atualizar contadores do evento", error);
      }
    }

    if (data.purchaseId) {
      await sendPurchaseEmail(data.purchaseId, {
        userId: data.userId,
        eventId: data.eventId,
        ticketsCount: 1,
      });
    }
  }
);

const sendTicketEmail = async (
  userId: string,
  eventId: string,
  ticketsCount: number,
  options?: { accountCreated?: boolean }
) => {
  try {
    const [userRecord, eventSnap] = await Promise.all([
      admin.auth().getUser(userId),
      getFirestore().collection("events").doc(eventId).get(),
    ]);

    if (!userRecord.email) {
      logger.warn("Usuário sem email para envio de ingresso", { userId });
      return;
    }

    const event = eventSnap.data() as
      | { title?: string; date?: string; time?: string; location?: string }
      | undefined;
    const eventTitle = event?.title || "IngressosZ";
    let dateText = "";
    if (event?.date) {
      dateText = new Date(event.date).toLocaleDateString("pt-BR");
    }
    const timeText = event?.time ? ` ${event.time}` : "";
    const locationText = event?.location || "";
    const infoLines = [
      event?.date ? `Data: ${dateText}${timeText}` : "",
      locationText ? `Local: ${locationText}` : "",
    ].filter(Boolean);
    let accountLine = "";
    if (options?.accountCreated && userRecord.email) {
      try {
        const baseURL = webBaseUrl.value();
        const link = await admin
          .auth()
          .generatePasswordResetLink(userRecord.email, {
            url: `${baseURL}/login`,
          });
        accountLine =
          "<p>Sua conta foi criada automaticamente.</p>" +
          `<p>Defina sua senha aqui: <a href="${link}">Criar senha</a></p>`;
      } catch (error) {
        logger.warn("Falha ao gerar link de senha", error);
      }
    }

    const subject = `Ingressos confirmados – ${eventTitle}`;
    const ticketWord = ticketsCount === 1 ? "ingresso" : "ingressos";
    const bannerImg = (event as { image?: string })?.image;
    /* eslint-disable max-len, quotes, operator-linebreak */
    const bannerHtml = bannerImg
      ? `<img src="${bannerImg}" alt="${eventTitle}" ` +
        'style="width:100%;max-height:220px;object-fit:cover;display:block;" />'
      : "";
    const infoRows = infoLines
      .map(
        (line) =>
          "<tr><td " +
          'style="padding:7px 0;color:#475569;font-size:13px;border-bottom:1px solid #e2e8f0;">' +
          `${line}</td></tr>`
      )
      .join("");
    const baseURL = webBaseUrl.value();
    const baseHost = baseURL.replace(/^https?:\/\//, "").replace(/\/+$/, "");
    const html = [
      "<!DOCTYPE html>",
      '<html lang="pt-BR">',
      "<head>",
      '<meta charset="UTF-8">',
      '<meta name="viewport" content="width=device-width,initial-scale=1">',
      "<title>Ingressos Confirmados</title>",
      "</head>",
      '<body style="margin:0;padding:0;background:#EFF6FF;',
      "font-family:'Helvetica Neue',Arial,sans-serif;\">",

      // Outer wrapper
      '<table width="100%" cellpadding="0" cellspacing="0" ',
      'style="background:#EFF6FF;padding:40px 16px;">',
      '<tr><td align="center">',

      // Card
      '<table width="560" cellpadding="0" cellspacing="0" ',
      'style="background:#ffffff;border-radius:20px;overflow:hidden;',
      "box-shadow:0 8px 32px rgba(37,99,235,0.10);max-width:560px;width:100%;\">",

      // Header gradient — Premium Blue
      "<tr>",
      '<td style="background:linear-gradient(135deg,#1d4ed8 0%,#3b82f6 100%);',
      'padding:32px 36px 28px;">',
      '<p style="margin:0 0 8px;color:rgba(255,255,255,0.70);font-size:10px;',
      'font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">',
      "INGRESSOSZ · CONFIRMAÇÃO DE COMPRA</p>",
      '<h1 style="margin:0;color:#ffffff;font-size:24px;font-weight:800;',
      `line-height:1.25;letter-spacing:-0.01em;">${eventTitle}</h1>`,
      "</td>",
      "</tr>",

      // Banner (optional)
      bannerImg ? `<tr><td style="padding:0;">${bannerHtml}</td></tr>` : "",

      // Body
      "<tr>",
      '<td style="padding:32px 36px;">',

      // Greeting
      '<p style="margin:0 0 24px;font-size:16px;color:#0f172a;line-height:1.6;">',
      `Olá! ${ticketsCount === 1 ? "Seu" : "Seus"} <strong style="color:#1d4ed8;">${ticketsCount} ${ticketWord}</strong> `,
      "para o evento foram confirmados com sucesso.</p>",

      // Event info table
      infoRows
        ? '<table cellpadding="0" cellspacing="0" ' +
          'style="width:100%;margin-bottom:28px;background:#F8FAFF;' +
          'border-radius:12px;border:1px solid #DBEAFE;padding:4px 16px;">' +
          infoRows +
          "</table>"
        : "",

      // Account created notice
      accountLine
        ? '<div style="background:#EFF6FF;border:1px solid #BFDBFE;border-radius:10px;' +
          'padding:16px 18px;margin-bottom:24px;font-size:13px;color:#1e40af;">' +
          accountLine +
          "</div>"
        : "",

      // CTA Button
      '<table cellpadding="0" cellspacing="0" style="margin-bottom:8px;">',
      '<tr><td style="border-radius:10px;',
      'background:linear-gradient(135deg,#1d4ed8,#3b82f6);',
      'box-shadow:0 4px 14px rgba(37,99,235,0.35);">',
      `<a href="${baseURL}/meus-ingressos" `,
      'style="display:inline-block;color:#ffffff;font-weight:700;font-size:14px;',
      'padding:14px 32px;border-radius:10px;text-decoration:none;',
      'letter-spacing:0.03em;">Ver Meus Ingressos</a>',
      "</td></tr></table>",

      "</td>",
      "</tr>",

      // Footer
      "<tr>",
      '<td style="background:#F1F5F9;padding:18px 36px;border-top:1px solid #E2E8F0;">',
      '<p style="margin:0;font-size:11px;color:#94a3b8;text-align:center;line-height:1.7;">',
      `Dúvidas? Acesse <a href="${baseURL}" `,
      `style="color:#2563eb;text-decoration:none;font-weight:600;">${baseHost}</a>`,
      "<br>Este é um e-mail automático, não responda.",
      "</p>",
      "</td>",
      "</tr>",

      "</table>",
      "</td></tr>",
      "</table>",
      "</body>",
      "</html>",
    ].join("");
    /* eslint-enable max-len, quotes, operator-linebreak */

    await sendEmail(userRecord.email, subject, html);
  } catch (error) {
    logger.error("Erro ao preparar email de ingresso:", error);
  }
};

export const sendPurchaseEmail = async (
  purchaseId: string,
  fallback?: {
    userId?: string;
    eventId?: string;
    ticketsCount?: number;
    accountCreated?: boolean;
  }
) => {
  const purchaseRef = getFirestore().collection("purchases").doc(purchaseId);
  let shouldSend = false;
  let userId = fallback?.userId;
  let eventId = fallback?.eventId;
  let ticketsCount = fallback?.ticketsCount;
  let accountCreated = fallback?.accountCreated;

  try {
    await getFirestore().runTransaction(async (transaction) => {
      const purchaseSnap = await transaction.get(purchaseRef);
      if (!purchaseSnap.exists) {
        return;
      }

      const purchase = purchaseSnap.data() as {
        emailSent?: boolean;
        userId?: string;
        eventId?: string;
        items?: Array<{ quantity?: number }>;
        accountCreated?: boolean;
      };

      if (purchase.emailSent) {
        return;
      }

      userId = purchase.userId ?? userId;
      eventId = purchase.eventId ?? eventId;
      accountCreated = purchase.accountCreated ?? accountCreated;
      if (!ticketsCount && purchase.items?.length) {
        ticketsCount = purchase.items.reduce(
          (acc, item) => acc + Number(item.quantity || 0),
          0
        );
      }
      if (!ticketsCount) {
        ticketsCount = 1;
      }

      transaction.update(purchaseRef, {
        emailSent: true,
        emailSentAt: FieldValue.serverTimestamp(),
      });
      shouldSend = true;
    });
  } catch (error) {
    logger.error("Erro ao preparar envio de email da compra:", error);
    return;
  }

  if (!shouldSend) {
    return;
  }

  if (!userId || !eventId) {
    logger.warn("Dados insuficientes para email da compra", {
      purchaseId,
      userId,
      eventId,
    });
    return;
  }

  await sendTicketEmail(userId, eventId, ticketsCount ?? 1, {
    accountCreated: Boolean(accountCreated),
  });
};

const sendEmail = async (to: string, subject: string, html: string) => {
  try {
    const email = smtpEmail.value();
    const password = smtpPassword.value();
    const host = smtpHost.value();
    const port = parseInt(smtpPort.value(), 10);
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    const isLocalHost = host === "localhost" || host === "127.0.0.1";
    const requiresAuth = !(isEmulator && isLocalHost);
    const fromEmail =
      email || (isEmulator && isLocalHost ? "no-reply@localhost" : "");

    if (!fromEmail || (requiresAuth && (!email || !password))) {
      logger.warn("Credenciais de email não configuradas. Email não enviado.");
      return;
    }

    const transportOptions: Record<string, unknown> = {
      host,
      port,
      secure: port === 465,
    };

    if (requiresAuth && email && password) {
      transportOptions.auth = {
        user: email,
        pass: password,
      };
    }

    const transporter = nodemailer.createTransport(
      transportOptions as nodemailer.TransportOptions
    );

    await transporter.sendMail({
      from: `"IngressosZ" <${fromEmail}>`,
      to,
      subject,
      html,
    });

    logger.info(`Email enviado com sucesso para: ${to}`);
  } catch (error) {
    logger.error("Erro ao enviar email:", error);
  }
};
