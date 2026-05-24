import { FieldValue, getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";

const PIX_EXPIRATION_MINUTES = 30;

export const expireStalePixSessions = onSchedule(
  { schedule: "every 15 minutes", region: "southamerica-east1" },
  async () => {
    const db = getFirestore();
    const cutoff = new Date(Date.now() - PIX_EXPIRATION_MINUTES * 60 * 1000);

    const snapshot = await db
      .collection("paymentSessions")
      .where("status", "==", "pending")
      .where("createdAt", "<", cutoff)
      .get();

    if (snapshot.empty) {
      logger.info("Nenhuma sessão Pix expirada encontrada.");
      return;
    }

    const batchSize = 500;
    let processed = 0;

    for (let i = 0; i < snapshot.docs.length; i += batchSize) {
      const batch = db.batch();
      const chunk = snapshot.docs.slice(i, i + batchSize);

      for (const docSnap of chunk) {
        batch.update(docSnap.ref, {
          status: "expired",
          expiredAt: FieldValue.serverTimestamp(),
        });
      }

      await batch.commit();
      processed += chunk.length;
    }

    logger.info(
      `${processed} sessões de pagamento expiradas marcadas como expired.`
    );
  }
);
