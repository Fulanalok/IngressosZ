import {
  getFirestore,
  type DocumentSnapshot,
  type QueryDocumentSnapshot,
} from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { MercadoPagoConfig, PaymentRefund } from "mercadopago";
import { requireCurrentAdmin } from "../auth/authorization.js";
import { mercadopagoAccessToken } from "../config/params.js";
import { callableSecurityOptions } from "../config/security.js";
import { checkRateLimit } from "../utils/rateLimit.js";
export const refundPayment = onCall(
  { ...callableSecurityOptions, secrets: [mercadopagoAccessToken] },
  // eslint-disable-next-line complexity -- legacy refund flow
  async (request) => {
    const identity = await requireCurrentAdmin(request.auth);
    const allowedRefund = await checkRateLimit(
      `refund:${identity.uid}`,
      10
    );
    if (!allowedRefund) {
      throw new HttpsError(
        "resource-exhausted",
        "Muitas tentativas. Aguarde um momento e tente novamente."
      );
    }

    const { paymentId, purchaseId } = (request.data ?? {}) as {
      paymentId?: string;
      purchaseId?: string;
    };

    const client = new MercadoPagoConfig({
      accessToken: mercadopagoAccessToken.value(),
    });

    const refund = new PaymentRefund(client);

    try {
      const purchasesRef = getFirestore().collection("purchases");
      let resolvedPaymentId = paymentId;
      let purchaseDoc:
        | DocumentSnapshot
        | QueryDocumentSnapshot
        | undefined;

      if (purchaseId) {
        const purchaseSnap = await purchasesRef.doc(purchaseId).get();
        if (purchaseSnap.exists) {
          purchaseDoc = purchaseSnap;
          const purchaseData = purchaseSnap.data() as { paymentId?: string };
          resolvedPaymentId = resolvedPaymentId || purchaseData.paymentId;
        }
      }

      if (!purchaseDoc && resolvedPaymentId) {
        const snapshot = await purchasesRef
          .where("paymentId", "==", resolvedPaymentId)
          .limit(1)
          .get();
        purchaseDoc = snapshot.docs[0];
      }

      if (!resolvedPaymentId) {
        throw new HttpsError(
          "invalid-argument",
          "ID de pagamento ou compra é obrigatório."
        );
      }

      await refund.create({ payment_id: resolvedPaymentId });

      if (purchaseDoc) {
        await purchaseDoc.ref.update({ status: "refunded" });

        const ticketsRef = getFirestore().collection("tickets");
        const ticketsSnapshot = await ticketsRef
          .where("purchaseId", "==", purchaseDoc.id)
          .get();

        const batch = getFirestore().batch();
        ticketsSnapshot.docs.forEach((doc) => {
          batch.update(doc.ref, { status: "cancelled" });
        });
        await batch.commit();
      } else {
        logger.warn("Compra não encontrada para atualização de reembolso.", {
          paymentId: resolvedPaymentId,
          purchaseId,
        });
      }

      return { success: true, message: "Reembolso processado com sucesso." };
    } catch (error) {
      if (error instanceof HttpsError) {
        throw error;
      }
      logger.error("Erro ao processar reembolso:", error);
      throw new HttpsError(
        "internal",
        "Erro ao processar reembolso no Mercado Pago."
      );
    }
  }
);
