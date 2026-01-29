import * as admin from "firebase-admin";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall, onRequest } from "firebase-functions/v2/https";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import * as nodemailer from "nodemailer";

// Inicializa o Firebase Admin SDK.
admin.initializeApp();

// Configuração do Transporter de Email (Simulado ou Real)
// Para produção, configure as variáveis de ambiente: SMTP_HOST, SMTP_USER, SMTP_PASS
const mailTransport = nodemailer.createTransport({
  host: process.env.SMTP_HOST || "smtp.ethereal.email",
  port: 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER || "test_user",
    pass: process.env.SMTP_PASS || "test_pass",
  },
});

/**
 * Envia email de confirmação de compra
 */
async function sendTicketEmail(
  to: string,
  ticketCount: number,
  eventTitle: string
) {
  const mailOptions = {
    from: '"IngressosZ" <noreply@ingressosz.com>',
    to: to,
    subject: `Seus Ingressos para ${eventTitle}`,
    text: `Olá! Sua compra de ${ticketCount} ingresso(s) para ${eventTitle} foi confirmada. Acesse o app para ver seus QRCodes.`,
    html: `
      <div style="font-family: Arial, sans-serif; color: #333;">
        <h1>Pagamento Confirmado! 🎉</h1>
        <p>Olá,</p>
        <p>Sua compra de <strong>${ticketCount} ingresso(s)</strong> para o evento <strong>${eventTitle}</strong> foi processada com sucesso.</p>
        <p>Para acessar seus ingressos e o QR Code de entrada, acesse a seção "Meus Ingressos" no aplicativo ou site.</p>
        <br>
        <a href="https://ingressosz.com/meus-ingressos" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Ver Meus Ingressos</a>
      </div>
    `,
  };

  try {
    if (!process.env.SMTP_HOST) {
      logger.info("SMTP não configurado. Email seria enviado para:", to);
      return;
    }
    await mailTransport.sendMail(mailOptions);
    logger.info("Email de confirmação enviado para:", to);
  } catch (error) {
    logger.error("Erro ao enviar email:", error);
  }
}

// Configuração do Mercado Pago
// IMPORTANTE: Em produção, use process.env.MP_ACCESS_TOKEN configurado via secrets
const mpClient = new MercadoPagoConfig({
  accessToken:
    process.env.MP_ACCESS_TOKEN || "TEST-00000000-0000-0000-0000-000000000000",
});

/**
 * Cloud Function HTTPS Callable para definir um
 * Custom Claim 'admin' para um usuário.
 */
export const setAdminRole = onCall(async (request) => {
  // 1. Verificação de Autenticação
  if (!request.auth) {
    throw new HttpsError(
      "unauthenticated",
      "Apenas usuários autenticados podem chamar esta função."
    );
  }

  // 2. Verificação de Autorização
  const user = await admin.auth().getUser(request.auth.uid);
  const callerClaims = user.customClaims;
  if (!callerClaims || !callerClaims.admin) {
    throw new HttpsError(
      "permission-denied",
      "Você não tem permissão para conceder o papel de administrador."
    );
  }

  // 3. Validação dos Dados
  const targetUid = request.data.uid;
  if (!targetUid || typeof targetUid !== "string") {
    throw new HttpsError(
      "invalid-argument",
      "O UID do usuário alvo é obrigatório e deve ser uma string."
    );
  }

  // 4. Definição do Custom Claim
  try {
    await admin.auth().setCustomUserClaims(targetUid, { admin: true });
    logger.log(`Custom claim 'admin: true' set for user ${targetUid}`);

    await admin.auth().revokeRefreshTokens(targetUid);
    logger.log(`Refresh tokens revoked for user ${targetUid}.`);

    return {
      success: true,
      message: `Usuário ${targetUid} agora tem o papel de administrador.`,
    };
  } catch (error: any) {
    logger.error("Erro ao definir custom claims:", error);
    throw new HttpsError(
      "internal",
      `Ocorreu um erro ao processar a solicitação: ${error.message}`
    );
  }
});

/**
 * Função para logar erros do cliente no Cloud Logging.
 * Endpoint: /logClientError
 */
export const logClientError = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const errorData = req.body;
    let uid = "anonymous";
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      const idToken = req.headers.authorization.split("Bearer ")[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;
      } catch (e) {
        logger.warn("Invalid auth token in validateTicket", e);
      }
    }

    logger.error("Client Error:", {
      ...errorData,
      uid,
      source: "client-side",
    });

    res.status(200).send({ success: true });
  } catch (error: any) {
    logger.error("Failed to log client error:", error);
    res.status(500).send({ error: "Internal Server Error" });
  }
});

/**
 * Cria uma preferência de pagamento no Mercado Pago.
 * Endpoint: /mercadoPagoCreatePreference
 */
export const mercadoPagoCreatePreference = onRequest(
  { cors: true },
  async (req, res) => {
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      const { eventId, ticketType, quantity, userId } = req.body;

      if (!eventId || !ticketType || !quantity || !userId) {
        res.status(400).send("Dados incompletos");
        return;
      }

      // 1. Buscar detalhes do evento
      const eventDoc = await admin
        .firestore()
        .collection("events")
        .doc(eventId)
        .get();
      if (!eventDoc.exists) {
        res.status(404).send("Evento não encontrado");
        return;
      }

      const eventData = eventDoc.data();
      const eventTitle = eventData?.title || "Ingresso";

      // Calcular preço baseado no tipo
      let unitPrice = eventData?.price || 0;
      if (eventData?.pricing && eventData.pricing[ticketType]) {
        unitPrice = eventData.pricing[ticketType];
      } else {
        // Fallback multiplier logic if pricing map not present
        const multipliers: Record<string, number> = {
          standard: 1,
          vip: 2,
          premium: 3,
        };
        unitPrice = unitPrice * (multipliers[ticketType] || 1);
      }

      // 2. Criar registro de sessão de pagamento
      const paymentSessionRef = admin
        .firestore()
        .collection("paymentSessions")
        .doc();
      await paymentSessionRef.set({
        eventId,
        userId,
        ticketType,
        quantity,
        unitPrice,
        totalAmount: unitPrice * quantity,
        status: "pending",
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        provider: "mercadopago",
      });

      // 3. Criar preferência no Mercado Pago
      const preference = new Preference(mpClient);
      const result = await preference.create({
        body: {
          items: [
            {
              id: ticketType,
              title: `${eventTitle} - ${ticketType.toUpperCase()}`,
              quantity: Number(quantity),
              unit_price: Number(unitPrice),
              currency_id: "BRL",
            },
          ],
          payer: {
            // Em produção, pegar email do usuário do Auth ou Firestore
            email: "test_user_123456@testuser.com",
          },
          external_reference: paymentSessionRef.id,
          back_urls: {
            success: "http://localhost:5173/pagamento/sucesso", // Ajustar para URL de produção
            failure: "http://localhost:5173/pagamento/falha",
            pending: "http://localhost:5173/pagamento/pendente",
          },
          auto_return: "approved",
        },
      });

      // 4. Atualizar sessão com ID da preferência
      await paymentSessionRef.update({
        preferenceId: result.id,
        initPoint: result.init_point,
      });

      res.status(200).json({
        preferenceId: result.id,
        init_point: result.init_point,
        sandbox_init_point: result.sandbox_init_point,
      });
    } catch (error: any) {
      logger.error("Erro ao criar preferência:", error);
      res.status(500).send({ error: error.message || "Erro interno" });
    }
  }
);

/**
 * Valida um ingresso via QR Code.
 * Endpoint: /validateTicket
 */
export const validateTicket = onRequest({ cors: true }, async (req, res) => {
  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    const { qrCode } = req.body;
    let uid = "anonymous";
    if (
      req.headers.authorization &&
      req.headers.authorization.startsWith("Bearer ")
    ) {
      const idToken = req.headers.authorization.split("Bearer ")[1];
      try {
        const decodedToken = await admin.auth().verifyIdToken(idToken);
        uid = decodedToken.uid;
      } catch (e) {
        logger.warn("Invalid auth token in validateTicket", e);
      }
    }

    if (!qrCode) {
      res
        .status(400)
        .send({ success: false, message: "QR Code não fornecido" });
      return;
    }

    let ticketId, token;

    // Tentar parsear o QR Code
    try {
      const parsed = JSON.parse(qrCode);
      if (parsed.type === "INGRESSOSZ_TICKET") {
        ticketId = parsed.ticketId;
        token = parsed.qrCode;
      } else {
        ticketId = qrCode;
      }
    } catch (e) {
      ticketId = qrCode;
    }

    if (!ticketId) {
      res
        .status(400)
        .send({ success: false, message: "Formato de QR Code inválido" });
      return;
    }

    // Buscar ingresso no Firestore
    const ticketRef = admin.firestore().collection("tickets").doc(ticketId);
    const ticketDoc = await ticketRef.get();

    if (!ticketDoc.exists) {
      res
        .status(404)
        .send({ success: false, message: "Ingresso não encontrado" });
      return;
    }

    const ticketData = ticketDoc.data();

    // Verificação de segurança (Token)
    if (ticketData?.qrCode) {
      if (!token || ticketData.qrCode !== token) {
        res.status(403).send({
          success: false,
          message: "QR Code inválido (Token mismatch ou ausente)",
        });
        return;
      }
    } else if (token) {
      // Se o ingresso no banco não tem token (legado), mas o QR tem
      // Isso é incomum mas não necessariamente um ataque.
      // Vamos logar para monitoramento.
      logger.warn(
        `Ingresso ${ticketId} sem token no DB validado com token: ${token}`
      );
    }

    // Verificar se já foi usado
    if (ticketData?.status === "used") {
      res.status(200).send({
        success: false,
        status: "used",
        message: "Ingresso já utilizado!",
        ticket: {
          eventTitle: ticketData.eventTitle || "Evento Desconhecido",
          ticketType: ticketData.ticketType,
          holderEmail: ticketData.userId,
          eventDate: ticketData.eventDate,
          usedAt: ticketData.usedAt
            ? ticketData.usedAt.toDate().toISOString()
            : null,
        },
      });
      return;
    }

    // Marcar como usado
    await ticketRef.update({
      status: "used",
      usedAt: admin.firestore.FieldValue.serverTimestamp(),
      validatedBy: uid,
    });

    res.status(200).send({
      success: true,
      message: "Ingresso validado com sucesso!",
      ticket: {
        eventTitle: ticketData?.eventTitle || "Evento",
        ticketType: ticketData?.ticketType || "Geral",
        holderEmail: ticketData?.userId || "N/A",
        eventDate: ticketData?.eventDate,
        eventTime: ticketData?.eventTime,
      },
    });
  } catch (error: any) {
    logger.error("Erro na validação de ingresso:", error);
    res
      .status(500)
      .send({ success: false, message: "Erro interno no servidor" });
  }
});

/**
 * Webhook para receber notificações do Mercado Pago.
 * Endpoint: /mercadopagoWebhook
 */
export const mercadopagoWebhook = onRequest(async (req, res) => {
  const signature =
    req.headers["x-signature-id"] || req.headers["x-request-id"];
  const topic = req.body.topic || req.query.topic;
  const id = req.body.id || req.query.id;

  logger.info("Webhook recebido:", { topic, id, signature, body: req.body });

  if (!id) {
    res.status(400).send("ID ausente");
    return;
  }

  // Apenas processamos notificações de pagamento
  if (topic === "payment") {
    try {
      const payment = new Payment(mpClient);
      const paymentData = await payment.get({ id: String(id) });

      logger.info("Pagamento recuperado:", {
        status: paymentData.status,
        externalReference: paymentData.external_reference,
      });

      const externalRef = paymentData.external_reference;

      if (externalRef) {
        const paymentRef = admin
          .firestore()
          .collection("paymentSessions")
          .doc(externalRef);

        await paymentRef.update({
          status:
            paymentData.status === "approved"
              ? "completed"
              : paymentData.status,
          paymentId: String(id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          metadata: paymentData,
        });

        logger.info(
          `Pagamento ${externalRef} atualizado para ${paymentData.status}`
        );

        if (paymentData.status === "approved") {
          logger.info("Pagamento aprovado. Iniciar emissão de ingresso...");

          // Recuperar dados da sessão
          const sessionDoc = await paymentRef.get();
          const sessionData = sessionDoc.data();

          if (sessionData && !sessionData.ticketsCreated) {
            const { eventId, userId, ticketType, quantity, unitPrice } =
              sessionData;

            // Recuperar dados do evento
            const eventDoc = await admin
              .firestore()
              .collection("events")
              .doc(eventId)
              .get();
            const eventData = eventDoc.data();

            const batch = admin.firestore().batch();
            const ticketsCollection = admin.firestore().collection("tickets");

            for (let i = 0; i < quantity; i++) {
              const newTicketRef = ticketsCollection.doc();
              const qrToken = Math.random().toString(36).substring(2, 15); // Token simples de segurança

              // Formato do QR para validação:
              // Deve ser um JSON string que o frontend/backend consiga ler
              const qrPayload = JSON.stringify({
                type: "INGRESSOSZ_TICKET",
                ticketId: newTicketRef.id,
                qrCode: qrToken,
                eventId,
                timestamp: Date.now(),
              });

              const ticketData = {
                id: newTicketRef.id,
                eventId,
                userId,
                userEmail:
                  sessionData.userEmail ||
                  paymentData.payer.email ||
                  "email@nao.informado",
                purchaseDate: admin.firestore.FieldValue.serverTimestamp(),
                qrCode: qrToken, // Token secreto salvo no banco
                qrPayload: qrPayload, // O que vai ser exibido no QR Code
                status: "active",
                price: unitPrice,
                ticketType,
                paymentId: String(id),
                eventTitle: eventData?.title || "Evento",
                eventDate: eventData?.date || "",
                eventTime: eventData?.time || "",
                eventLocation: eventData?.location || "",
              };

              batch.set(newTicketRef, ticketData);
            }

            // Marcar sessão como processada
            batch.update(paymentRef, { ticketsCreated: true });

            await batch.commit();
            logger.info(`${quantity} ingressos gerados para o pagamento ${id}`);
          } else {
            logger.info("Ingressos já gerados ou sessão não encontrada.");
          }
        }
      }

      res.status(200).send("OK");
    } catch (error: any) {
      logger.error("Erro ao processar pagamento:", error);
      res.status(500).send("Erro interno");
    }
  } else {
    res.status(200).send("Tópico ignorado");
  }
});
