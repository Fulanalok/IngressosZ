import * as admin from 'firebase-admin';
import * as logger from 'firebase-functions/logger';
import {HttpsError, onCall, onRequest} from 'firebase-functions/v2/https';
import {onObjectFinalized} from 'firebase-functions/v2/storage';
import {MercadoPagoConfig, Payment, Preference} from 'mercadopago';
import {defineSecret} from 'firebase-functions/params';
import sharp from 'sharp';
import * as path from 'path';
import * as os from 'os';
import * as fs from 'fs';

const mercadopagoAccessToken = defineSecret('MP_ACCESS_TOKEN');

admin.initializeApp();

export const optimizeImage = onObjectFinalized({bucket: 'ingressosz-51887.appspot.com'}, async (event) => {
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
});

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
    {secrets: [mercadopagoAccessToken]},
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

            const ticketsCount = items.reduce(
                (acc, item) => acc + Number(item.quantity),
                0
            );

            const purchaseRef = await admin
                .firestore()
                .collection('purchases')
                .add({
                  userId,
                  eventId,
                  paymentId,
                  status: 'approved',
                  items: items,
                  createdAt: admin.firestore.FieldValue.serverTimestamp(),
                });

            const ticketsCollection = admin.firestore().collection('tickets');
            for (let i = 0; i < ticketsCount; i++) {
              await ticketsCollection.add({
                userId,
                eventId,
                purchaseId: purchaseRef.id,
                qrCode: 'pending',
                validated: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
              });
            }

            logger.info(
                `Compra ${purchaseRef.id} e ingressos para o usuário ${userId} ` +
              `no evento ${eventId} criados com sucesso.`
            );
          }
        } catch (error) {
          logger.error('Erro ao processar notificação de pagamento:', error);
        }
      }

      response.status(200).send('OK');
    }
);
