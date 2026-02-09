import cors from 'cors';
import {randomUUID} from 'crypto';
import * as admin from 'firebase-admin';
import * as Sentry from '@sentry/node';
import {nodeProfilingIntegration} from '@sentry/profiling-node';
import * as logger from 'firebase-functions/logger';
import {defineSecret, defineString} from 'firebase-functions/params';

// Inicialização do Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [
    nodeProfilingIntegration(),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0,
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

import {HttpsError, onCall, onRequest} from 'firebase-functions/v2/https';
import {onObjectFinalized} from 'firebase-functions/v2/storage';
import * as fs from 'fs';
import {
  MercadoPagoConfig,
  Payment,
  PaymentRefund,
  Preference,
} from 'mercadopago';
import * as nodemailer from 'nodemailer';
import * as os from 'os';
import * as path from 'path';
import sharp from 'sharp';

const mercadopagoAccessToken = defineSecret('MP_ACCESS_TOKEN');
const smtpEmail = defineSecret('SMTP_EMAIL');
const smtpPassword = defineSecret('SMTP_PASSWORD');
const smtpHost = defineString('SMTP_HOST', {default: 'smtp.gmail.com'});
const smtpPort = defineString('SMTP_PORT', {default: '465'});
const corsHandler = cors({origin: true});

admin.initializeApp();

export const seedDatabase = onCall(async (request) => {
  const events = [
    {
      title: 'Festival de Música 2024',
      description:
        'O maior festival de música do ano com artistas nacionais e internacionais',
      date: '2024-03-15',
      time: '20:00',
      location: 'Parque Ibirapuera - São Paulo',
      price: 150.0,
      availableTickets: 1000,
      totalTickets: 1000,
      category: 'Música',
      imageUrl:
        'https://images.unsplash.com/photo-1493225457124-a3eb161ffa5f?w=500',
      organizerId: 'test-organizer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    {
      title: 'Stand-up Comedy Night',
      description:
        'Uma noite de muito humor com os melhores comediantes do país',
      date: '2024-03-20',
      time: '21:00',
      location: 'Teatro Municipal - Rio de Janeiro',
      price: 80.0,
      availableTickets: 500,
      totalTickets: 500,
      category: 'Comédia',
      imageUrl:
        'https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?w=500',
      organizerId: 'test-organizer',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
  ];

  const eventIds: string[] = [];

  try {
    const batch = admin.firestore().batch();
    const eventsCollection = admin.firestore().collection('events');

    for (const event of events) {
      const docRef = eventsCollection.doc();
      batch.set(docRef, {
        ...event,
        createdBy: request.auth?.uid || 'system',
      });
      eventIds.push(docRef.id);
    }

    // Criar ingressos de teste para o usuário atual
    if (request.auth?.uid && eventIds.length > 0) {
      const ticketsCollection = admin.firestore().collection('tickets');
      const eventId = eventIds[0];

      // Ticket Válido
      const validTicketRef = ticketsCollection.doc();
      batch.set(validTicketRef, {
        userId: request.auth.uid,
        eventId: eventId,
        qrCode: 'TICKET-' + randomUUID(),
        status: 'valid',
        validated: false,
        purchaseId: 'test-purchase',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Ticket Usado
      const usedTicketRef = ticketsCollection.doc();
      batch.set(usedTicketRef, {
        userId: request.auth.uid,
        eventId: eventId,
        qrCode: 'TICKET-' + randomUUID(),
        status: 'used',
        validated: true,
        usedAt: admin.firestore.FieldValue.serverTimestamp(),
        purchaseId: 'test-purchase',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return {success: true, eventIds};
  } catch (error) {
    logger.error('Erro ao seedar banco de dados:', error);
    throw new HttpsError('internal', 'Erro ao criar dados de teste.');
  }
});

export const optimizeImage = onObjectFinalized(
  {bucket: 'ingressosz-51887.appspot.com'},
  async (event) => {
    const {bucket, name, contentType} = event.data;
    if (!contentType?.startsWith('image/')) {
      logger.log('This is not an image.');
      return;
    }

    if (name.endsWith('_1080.webp')) {
      logger.log('Image is already optimized.');
      return;
    }

    const storageBucket = admin.storage().bucket(bucket);
    const tempFilePath = path.join(os.tmpdir(), path.basename(name));
    const metadata = {contentType: 'image/webp'};

    await storageBucket.file(name).download({destination: tempFilePath});

    const newFileName = `${path.basename(name, path.extname(name))}_1080.webp`;
    const newFilePath = path.join(path.dirname(name), newFileName);

    await sharp(tempFilePath)
      .resize(1080, 1080, {fit: 'inside', withoutEnlargement: true})
      .webp({quality: 80})
      .toFile(path.join(os.tmpdir(), newFileName));

    await storageBucket.upload(path.join(os.tmpdir(), newFileName), {
      destination: newFilePath,
      metadata: metadata,
    });

    fs.unlinkSync(tempFilePath);
  }
);

export const createPaymentPreference = onCall(
  {secrets: [mercadopagoAccessToken]},
  async (request) => {
    const client = new MercadoPagoConfig({
      accessToken: mercadopagoAccessToken.value(),
    });
    try {
      const {items, payer, eventId, userId} = request.data;
      const preference = new Preference(client);

      const result = await preference.create({
        body: {
          items,
          payer,
          metadata: {eventId, userId},
          back_urls: {
            success: 'https://ingressosz-51887.web.app/payment-success',
            failure: 'https://ingressosz-51887.web.app/payment-canceled',
            pending: 'https://ingressosz-51887.web.app/payment-pending',
          },
          auto_return: 'approved',
        },
      });

      return {id: result.id};
    } catch (error) {
      logger.error('Erro ao criar preferência de pagamento:', error);
      throw new HttpsError(
        'internal',
        'Não foi possível criar a preferência de pagamento.'
      );
    }
  }
);

export const receiveWebhook = onRequest(
  {secrets: [mercadopagoAccessToken, smtpEmail, smtpPassword]},
  async (request, response) => {
    const client = new MercadoPagoConfig({
      accessToken: mercadopagoAccessToken.value(),
    });
    logger.info('Webhook do Mercado Pago recebido');
    const {body} = request;

    if (body.type === 'payment') {
      const paymentId = body.data.id;
      logger.info(`Pagamento recebido: ${paymentId}`);

      try {
        const payment = await new Payment(client).get({id: paymentId});

        if (
          payment.status === 'approved' &&
          payment.metadata &&
          payment.additional_info?.items
        ) {
          const {eventId, userId} = payment.metadata;
          const items = payment.additional_info.items;

          // Idempotency check: Ensure payment wasn't already processed
          const purchasesRef = admin.firestore().collection('purchases');
          const snapshot = await purchasesRef
            .where('paymentId', '==', paymentId)
            .get();

          if (!snapshot.empty) {
            logger.info(
              `Pagamento ${paymentId} já processado anteriormente. Ignorando.`
            );
            response.status(200).send('OK');
            return;
          }

          const ticketsCount = items.reduce(
            (acc, item) => acc + Number(item.quantity),
            0
          );

          // Use transaction to ensure atomicity between Purchase and Tickets creation
          await admin.firestore().runTransaction(async (transaction) => {
            const newPurchaseRef = purchasesRef.doc();

            transaction.set(newPurchaseRef, {
              userId,
              eventId,
              paymentId,
              status: 'approved',
              items: items,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            const ticketsCollection = admin.firestore().collection('tickets');
            for (let i = 0; i < ticketsCount; i++) {
              const newTicketRef = ticketsCollection.doc();
              transaction.set(newTicketRef, {
                userId,
                eventId,
                purchaseId: newPurchaseRef.id,
                qrCode: randomUUID(),
                validated: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }
          });

          logger.info(
            `Compra e ${ticketsCount} ingressos para o usuário ${userId} ` +
              `no evento ${eventId} criados com sucesso via transação.`
          );

          // Tentar enviar email de confirmação
          try {
            const userRecord = await admin.auth().getUser(userId);
            if (userRecord.email) {
              await sendEmail(
                userRecord.email,
                'Seus ingressos chegaram! - IngressosZ',
                `Olá! Seus ${ticketsCount} ingressos foram confirmados. Acesse o app para visualizar.`
              );
            }
          } catch (emailError) {
            logger.error('Erro ao enviar email de confirmação:', emailError);
            // Não falhar a request se o email falhar
          }
        }
      } catch (error) {
        logger.error('Erro ao processar notificação de pagamento:', error);
      }
    }

    response.status(200).send('OK');
  }
);

export const validateTicket = onRequest(async (req, res) => {
  corsHandler(req, res, async () => {
    try {
      // 1. Auth check
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        res.status(401).json({success: false, message: 'Não autorizado'});
        return;
      }
      const token = authHeader.split('Bearer ')[1];
      try {
        await admin.auth().verifyIdToken(token);
      } catch (e) {
        res.status(401).json({success: false, message: 'Token inválido'});
        return;
      }

      // 2. Parse input
      const {qrCode} = req.body;
      if (!qrCode) {
        res
          .status(400)
          .json({success: false, message: 'QR Code não fornecido'});
        return;
      }

      let ticketData;
      try {
        ticketData = JSON.parse(qrCode);
      } catch (e) {
        res
          .status(400)
          .json({success: false, message: 'Formato de QR Code inválido'});
        return;
      }

      const {ticketId, qrCode: secret, type} = ticketData;

      if (type !== 'INGRESSOSZ_TICKET' || !ticketId || !secret) {
        res.status(400).json({success: false, message: 'QR Code malformado'});
        return;
      }

      // 3. Verify Ticket
      const ticketRef = admin.firestore().collection('tickets').doc(ticketId);
      const ticketSnap = await ticketRef.get();

      if (!ticketSnap.exists) {
        res
          .status(404)
          .json({success: false, message: 'Ingresso não encontrado'});
        return;
      }

      const ticket = ticketSnap.data();

      if (!ticket) {
        res.status(500).json({
          success: false,
          message: 'Erro ao recuperar dados do ingresso',
        });
        return;
      }

      if (ticket.qrCode !== secret) {
        res
          .status(403)
          .json({success: false, message: 'QR Code inválido ou adulterado'});
        return;
      }

      if (ticket?.validated) {
        res.status(400).json({
          success: false,
          status: 'used',
          message: 'Ingresso já utilizado',
        });
        return;
      }

      // 4. Update validated status
      await ticketRef.update({
        validated: true,
        validatedAt: admin.firestore.FieldValue.serverTimestamp(),
        validatedBy: 'api',
      });

      // 5. Fetch Event Details
      const eventSnap = await admin
        .firestore()
        .collection('events')
        .doc(ticket.eventId)
        .get();
      const event = eventSnap.data();

      let holderEmail = 'N/A';
      try {
        const userRecord = await admin.auth().getUser(ticket.userId);
        holderEmail = userRecord.email || 'N/A';
      } catch (e) {
        logger.warn('Usuário do ingresso não encontrado:', ticket.userId);
      }

      res.status(200).json({
        success: true,
        ticket: {
          eventTitle: event?.title || 'Evento Desconhecido',
          ticketType: 'Geral',
          holderEmail,
          eventDate: event?.date,
          eventTime: event?.time,
        },
      });
    } catch (error) {
      logger.error('Erro na validação:', error);
      res.status(500).json({success: false, message: 'Erro interno'});
    }
  });
});

// ============================================================================
// Admin Management
// ============================================================================

/**
 * Define um usuário como administrador.
 * Requer que o chamador já seja um administrador.
 * Para o primeiro admin, use o Firebase Console ou um script temporário.
 */
export const setAdminRole = onCall(async (request) => {
  // Verificação de segurança: Apenas admins podem criar outros admins
  if (request.auth?.token.admin !== true) {
    throw new HttpsError(
      'permission-denied',
      'Apenas administradores podem realizar esta operação.'
    );
  }

  const {uid} = request.data;

  if (!uid) {
    throw new HttpsError('invalid-argument', 'O UID do usuário é obrigatório.');
  }

  try {
    await admin.auth().setCustomUserClaims(uid, {admin: true, role: 'admin'});
    return {success: true, message: `Usuário ${uid} agora é administrador.`};
  } catch (error) {
    logger.error('Erro ao definir admin:', error);
    throw new HttpsError('internal', 'Erro ao definir privilégios de admin.');
  }
});

// ============================================================================
// Email Notifications (Stub)
// ============================================================================

/**
 * Função interna para enviar emails usando Nodemailer.
 * Requer configuração das variáveis de ambiente SMTP_EMAIL e SMTP_PASSWORD.
 *
 * @param {string} to Endereço de email do destinatário.
 * @param {string} subject Assunto do email.
 * @param {string} html Corpo do email em formato HTML.
 * @return {Promise<void>} Promessa que resolve quando o email é enviado.
 */
async function sendEmail(to: string, subject: string, html: string) {
  try {
    const email = smtpEmail.value();
    const password = smtpPassword.value();
    const host = smtpHost.value();
    const port = parseInt(smtpPort.value());

    if (!email || !password) {
      logger.warn('Credenciais de email não configuradas. Email não enviado.');
      return;
    }

    const transporter = nodemailer.createTransport({
      host: host,
      port: port,
      secure: port === 465, // true para 465, false para outras portas
      auth: {
        user: email,
        pass: password,
      },
    });

    await transporter.sendMail({
      from: `"IngressosZ" <${email}>`,
      to: to,
      subject: subject,
      html: html,
    });

    logger.info(`Email enviado com sucesso para: ${to}`);
  } catch (error) {
    logger.error('Erro ao enviar email:', error);
    // Não lançamos erro para não interromper o fluxo principal (webhook)
  }
}

// ============================================================================
// Refund Logic (Stub)
// ============================================================================

/**
 * Processa reembolso de pagamento.
 * Integração com API de Reembolso do Mercado Pago.
 */
export const refundPayment = onCall(
  {secrets: [mercadopagoAccessToken]},
  async (request) => {
    if (request.auth?.token.admin !== true) {
      throw new HttpsError(
        'permission-denied',
        'Apenas admins podem reembolsar.'
      );
    }

    const {paymentId} = request.data;
    const client = new MercadoPagoConfig({
      accessToken: mercadopagoAccessToken.value(),
    });
    const refund = new PaymentRefund(client);

    try {
      // Tenta reembolsar (refund) ou cancelar (cancel)
      // O SDK v2 unifica ou requer verificação de status.
      // Vamos tentar refund, que é o mais comum para pagamentos aprovados.
      await refund.create({payment_id: paymentId});

      // Atualizar Firestore
      const purchasesRef = admin.firestore().collection('purchases');
      const snapshot = await purchasesRef
        .where('paymentId', '==', paymentId)
        .get();

      if (!snapshot.empty) {
        const purchaseDoc = snapshot.docs[0];
        await purchaseDoc.ref.update({status: 'refunded'});

        // Cancelar ingressos associados
        const ticketsRef = admin.firestore().collection('tickets');
        const ticketsSnapshot = await ticketsRef
          .where('purchaseId', '==', purchaseDoc.id)
          .get();

        const batch = admin.firestore().batch();
        ticketsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, {status: 'cancelled'});
        });
        await batch.commit();
      } else {
        logger.warn(
          `Compra com paymentId ${paymentId} não encontrada no Firestore para atualização.`
        );
      }

      return {success: true, message: 'Reembolso processado com sucesso.'};
    } catch (error) {
      logger.error('Erro ao processar reembolso:', error);
      throw new HttpsError(
        'internal',
        'Erro ao processar reembolso no Mercado Pago.'
      );
    }
  }
);
