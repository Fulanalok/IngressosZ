
import * as Sentry from '@sentry/node';
import cors from 'cors';
import {createHmac} from 'crypto';
import * as admin from 'firebase-admin';
import {getFunctions} from 'firebase-admin/functions';
import * as logger from 'firebase-functions/logger';
import {defineSecret, defineString} from 'firebase-functions/params';
import {onTaskDispatched, TaskQueueOptions} from 'firebase-functions/v2/tasks';
import * as jwt from 'jsonwebtoken';

// Inicialização do Sentry
Sentry.init({
  dsn: process.env.SENTRY_DSN,
  integrations: [],
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

// ===========================================================================
// CONFIGURATION
// ===========================================================================

const mercadopagoAccessToken = defineSecret('MP_ACCESS_TOKEN');
const mpWebhookSecret = defineSecret('MP_WEBHOOK_SECRET');
const jwtSecret = defineSecret('JWT_SECRET');
const smtpEmail = defineSecret('SMTP_EMAIL');
const smtpPassword = defineSecret('SMTP_PASSWORD');
const smtpHost = defineString('SMTP_HOST', {default: 'smtp.gmail.com'});
const smtpPort = defineString('SMTP_PORT', {default: '465'});

const PAYMENT_QUEUE_NAME = 'processpaymentqueue'; // Firebase lowercases function names for queues

const corsHandler = cors({origin: true});
admin.initializeApp();

// ===========================================================================
// PAYMENT PROCESSING - STEP 1: Webhook receives and enqueues task
// ===========================================================================

export const receiveWebhook = onRequest(
  {secrets: [mpWebhookSecret]},
  async (request, response) => {
    logger.info('Webhook do Mercado Pago recebido');

    // 1. Validate Webhook Signature
    const xSignature = request.headers['x-signature'] as string;
    const xRequestId = request.headers['x-request-id'] as string;
    const dataId = request.body?.data?.id;

    if (mpWebhookSecret.value()) {
      if (!xSignature || !xRequestId || !dataId) {
        logger.warn('Webhook sem assinatura ou ID.');
        response.status(403).send('Forbidden');
        return;
      }
      const parts = xSignature.split(',');
      let ts;
      let hash;
      parts.forEach((part) => {
        const [key, value] = part.split('=');
        if (key && value) {
          if (key.trim() === 'ts') ts = value.trim();
          if (key.trim() === 'v1') hash = value.trim();
        }
      });
      const manifest = `id:${dataId};request-id:${xRequestId};ts:${ts};`;
      const hmac = createHmac('sha256', mpWebhookSecret.value());
      const digest = hmac.update(manifest).digest('hex');

      if (hash !== digest) {
        logger.error('Assinatura do Webhook inválida!');
        response.status(403).send('Forbidden');
        return;
      }
    }

    // 2. If valid, enqueue the task for processing
    if (request.body.type === 'payment') {
      const paymentId = request.body.data.id;
      logger.info(`Payment ${paymentId} received. Enqueuing for processing.`);

      try {
        const queue = getFunctions().taskQueue(PAYMENT_QUEUE_NAME);
        await queue.enqueue({paymentId: paymentId}); // Pass payload directly
        logger.info(`Task for paymentId: ${paymentId} enqueued successfully.`);
      } catch (error) {
        logger.error(`Failed to enqueue task for paymentId ${paymentId}:`, error);
        response.status(500).send('Error enqueuing processing task.');
        return;
      }
    }

    // 3. Respond immediately
    response.status(200).send('OK');
  }
);

// ===========================================================================
// PAYMENT PROCESSING - STEP 2: Worker processes task from the queue
// ===========================================================================

const queueOptions: TaskQueueOptions = {
  secrets: [mercadopagoAccessToken, smtpEmail, smtpPassword, jwtSecret],
  retryConfig: {
    maxAttempts: 5,
    minBackoffSeconds: 10,
    maxBackoffSeconds: 3600,
  },
  rateLimits: {
    maxDispatchesPerSecond: 10,
  },
};

export const processpaymentqueue = onTaskDispatched(
  queueOptions,
  async (request) => {
    const {paymentId} = request.data; // Payload is directly on `data`

    if (!paymentId) {
      logger.error('Task received without a paymentId. Discarding.');
      return;
    }

    logger.info(`Processing payment from queue: ${paymentId}`);
    const client = new MercadoPagoConfig({
      accessToken: mercadopagoAccessToken.value(),
    });

    try {
      const payment = await new Payment(client).get({id: paymentId});

      if (
        payment.status === 'approved' &&
        payment.metadata &&
        payment.additional_info?.items
      ) {
        const {eventId, userId} = payment.metadata;
        const items = payment.additional_info.items;

        const purchasesRef = admin.firestore().collection('purchases');
        const snapshot = await purchasesRef.where('paymentId', '==', paymentId).get();

        if (!snapshot.empty) {
          logger.info(`Payment ${paymentId} already processed. Ignoring.`);
          return;
        }

        const ticketsCount = items.reduce(
          (acc, item) => acc + Number(item.quantity),
          0
        );

        await admin.firestore().runTransaction(async (transaction) => {
          const eventRef = admin.firestore().collection('events').doc(eventId);
          const eventDoc = await transaction.get(eventRef);

          if (!eventDoc.exists) {
            throw new Error(`Event ${eventId} not found for payment ${paymentId}.`);
          }

          const currentStock = eventDoc.data()?.availableTickets || 0;
          if (currentStock < ticketsCount) {
            logger.error(`Overselling detected for event ${eventId}.`);
            const failedPurchaseRef = purchasesRef.doc();
            transaction.set(failedPurchaseRef, {
              userId,
              eventId,
              paymentId,
              status: 'refunded_oversold',
              items: items,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              error: 'Overselling detected',
            });
            return;
          }

          transaction.update(eventRef, {
            availableTickets: admin.firestore.FieldValue.increment(-ticketsCount),
          });

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
          const secret = jwtSecret.value() || 'default-dev-secret';

          for (let i = 0; i < ticketsCount; i++) {
            const newTicketRef = ticketsCollection.doc();
            const ticketPayload = {tid: newTicketRef.id, eid: eventId, uid: userId, ts: Date.now()};
            const signedToken = jwt.sign(ticketPayload, secret, {expiresIn: '30d'});
            transaction.set(newTicketRef, {
              userId,
              eventId,
              purchaseId: newPurchaseRef.id,
              qrCode: signedToken,
              validated: false,
              status: 'valid',
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
            });
          }
        });

        logger.info(`Purchase processed for ${userId} in event ${eventId}.`);

        try {
          const userRecord = await admin.auth().getUser(userId);
          if (userRecord.email) {
            await sendEmail(
              userRecord.email,
              'Seus ingressos chegaram! - IngressosZ',
              `Olá! Seus ${ticketsCount} ingressos foram confirmados.`
            );
          }
        } catch (emailError) {
          logger.error('Error sending confirmation email:', emailError);
        }
      }
    } catch (error) {
      logger.error(`Error processing payment ${paymentId}:`, error);
      throw error;
    }
  }
);


// ===========================================================================
// OTHER FUNCTIONS (Unchanged)
// ===========================================================================

export const seedDatabase = onCall(
  {secrets: [jwtSecret]},
  async (request) => {
    const db = admin.firestore();
    const batch = db.batch();
    const eventRef1 = db.collection('events').doc();
    batch.set(eventRef1, {
      title: 'Festival de Rock 2024',
      description: 'O maior festival de rock do ano!',
      date: '2024-12-25',
      time: '18:00',
      location: 'Arena Central',
      price: 150.0,
      availableTickets: 500,
      organizerId: request.auth?.uid || 'admin',
      imageUrl: 'https://placehold.co/600x400/png',
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const purchaseRef = db.collection('purchases').doc();
    batch.set(purchaseRef, {
      userId: request.auth?.uid || 'user_test',
      eventId: eventRef1.id,
      paymentId: 'mock_payment_123',
      status: 'approved',
      items: [{id: 'ticket', quantity: 2, unit_price: 150}],
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const secret = jwtSecret.value() || 'default-dev-secret';
    for (let i = 0; i < 2; i++) {
      const ticketRef = db.collection('tickets').doc();
      const ticketPayload = {
        tid: ticketRef.id,
        eid: eventRef1.id,
        uid: request.auth?.uid || 'user_test',
        ts: Date.now() + i,
      };
      const signedToken = jwt.sign(ticketPayload, secret, {expiresIn: '365d'});
      batch.set(ticketRef, {
        userId: request.auth?.uid || 'user_test',
        eventId: eventRef1.id,
        purchaseId: purchaseRef.id,
        qrCode: signedToken,
        validated: false,
        status: 'valid',
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    return {message: 'Database seeded successfully'};
  }
);

export const optimizeImage = onObjectFinalized(
  {bucket: '<your-project>.appspot.com'},
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
    const client = new MercadoPagoConfig({accessToken: mercadopagoAccessToken.value()});
    try {
      const {eventId, quantity = 1, userId} = request.data;
      if (!eventId || !userId || quantity < 1) {
        throw new HttpsError('invalid-argument', 'Dados inválidos para compra.');
      }
      const eventDoc = await admin.firestore().collection('events').doc(eventId).get();
      if (!eventDoc.exists) {
        throw new HttpsError('not-found', 'Evento não encontrado.');
      }
      const eventData = eventDoc.data();
      if ((eventData?.availableTickets || 0) < quantity) {
        throw new HttpsError('failed-precondition', 'Ingressos esgotados.');
      }
      const unitPrice = Number(eventData?.price || 0);
      const title = `Ingresso: ${eventData?.title}`;
      const items = [{
        id: eventId,
        title: title,
        quantity: quantity,
        unit_price: unitPrice,
        currency_id: 'BRL',
      }];
      const preference = new Preference(client);
      const result = await preference.create({
        body: {
          items,
          payer: {email: request.auth?.token.email},
          metadata: {eventId, userId, quantity},
          back_urls: {
            success: 'https://<your-project>.web.app/payment-success',
            failure: 'https://<your-project>.web.app/payment-canceled',
            pending: 'https://<your-project>.web.app/payment-pending',
          },
          auto_return: 'approved',
        },
      });
      return {id: result.id};
    } catch (error) {
      logger.error('Erro ao criar preferência de pagamento:', error);
      if (error instanceof HttpsError) throw error;
      throw new HttpsError('internal', 'Não foi possível criar a preferência.');
    }
  }
);

export const validateTicket = onRequest(
  {secrets: [jwtSecret]},
  async (req, res) => {
    corsHandler(req, res, async () => {
      try {
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
        const {qrCode} = req.body;
        if (!qrCode) {
          res.status(400).json({success: false, message: 'QR Code não fornecido'});
          return;
        }
        const secret = jwtSecret.value() || 'default-dev-secret';
        let decoded: string | jwt.JwtPayload;
        try {
          decoded = jwt.verify(qrCode, secret);
        } catch (e) {
          logger.warn(`Falha na verificação do token JWT: ${e}`);
          res.status(403).json({success: false, message: 'QR Code inválido ou expirado'});
          return;
        }
        const {tid: ticketId, eid: eventId, uid: userId} = decoded as jwt.JwtPayload;
        if (!ticketId || !eventId) {
          res.status(400).json({success: false, message: 'Conteúdo do QR Code inválido'});
          return;
        }
        const ticketRef = admin.firestore().collection('tickets').doc(ticketId);
        const ticketSnap = await ticketRef.get();
        if (!ticketSnap.exists) {
          res.status(404).json({success: false, message: 'Ingresso não encontrado'});
          return;
        }
        const ticket = ticketSnap.data();
        if (!ticket) {
          res.status(500).json({success: false, message: 'Erro ao recuperar dados do ingresso'});
          return;
        }
        if (ticket.qrCode !== qrCode) {
          res.status(403).json({success: false, message: 'QR Code revogado'});
          return;
        }
        if (ticket?.validated) {
          res.status(400).json({success: false, status: 'used', message: 'Ingresso já utilizado'});
          return;
        }
        await ticketRef.update({validated: true, validatedAt: admin.firestore.FieldValue.serverTimestamp()});
        const eventSnap = await admin.firestore().collection('events').doc(eventId).get();
        const event = eventSnap.data();
        let holderEmail = 'N/A';
        try {
          const userRecord = await admin.auth().getUser(userId);
          holderEmail = userRecord.email || 'N/A';
        } catch (e) {
          logger.warn('Usuário do ingresso não encontrado:', userId);
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
  }
);

/**
 * Define um usuário como administrador.
 * Requer que o chamador já seja um administrador.
 */
export const setAdminRole = onCall(async (request) => {
  if (request.auth?.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Apenas administradores podem realizar esta operação.');
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

/**
 * Função interna para enviar emails usando Nodemailer.
 * @param {string} to Endereço de email do destinatário.
 * @param {string} subject Assunto do email.
 * @param {string} html Corpo do email em formato HTML.
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
      secure: port === 465,
      auth: {user: email, pass: password},
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
  }
}

/**
 * Processa reembolso de pagamento.
 */
export const refundPayment = onCall(
  {secrets: [mercadopagoAccessToken]},
  async (request) => {
    if (request.auth?.token.admin !== true) {
      throw new HttpsError('permission-denied', 'Apenas admins podem reembolsar.');
    }
    const {paymentId} = request.data;
    const client = new MercadoPagoConfig({accessToken: mercadopagoAccessToken.value()});
    const refund = new PaymentRefund(client);
    try {
      await refund.create({payment_id: paymentId});
      const purchasesRef = admin.firestore().collection('purchases');
      const snapshot = await purchasesRef.where('paymentId', '==', paymentId).get();
      if (!snapshot.empty) {
        const purchaseDoc = snapshot.docs[0];
        await purchaseDoc.ref.update({status: 'refunded'});
        const ticketsRef = admin.firestore().collection('tickets');
        const ticketsSnapshot = await ticketsRef.where('purchaseId', '==', purchaseDoc.id).get();
        const batch = admin.firestore().batch();
        ticketsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, {status: 'cancelled'});
        });
        await batch.commit();
      } else {
        logger.warn(`Compra com paymentId ${paymentId} não encontrada.`);
      }
      return {success: true, message: 'Reembolso processado com sucesso.'};
    } catch (error) {
      logger.error('Erro ao processar reembolso:', error);
      throw new HttpsError('internal', 'Erro ao processar reembolso no Mercado Pago.');
    }
  }
);
