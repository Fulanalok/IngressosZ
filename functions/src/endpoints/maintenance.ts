import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { expireStalePaymentSessionsInFirestore } from
  "../infrastructure/paymentSessionMaintenanceFirestore.js";

export const expireStalePaymentSessions = onSchedule(
  { schedule: "every 15 minutes", region: "southamerica-east1" },
  async () => {
    await expireStalePaymentSessionsInFirestore({
      db: getFirestore(),
      nowMillis: Date.now(),
      logger,
      pageSize: 200,
    });
  }
);
