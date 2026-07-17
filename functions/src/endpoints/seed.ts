import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import jwt from "jsonwebtoken";
import { isAdminClaims } from "../auth/authorization.js";
import { jwtSecret } from "../config/params.js";
import { callableSecurityOptions } from "../config/security.js";
import { checkRateLimit } from "../utils/rateLimit.js";

export const seedDatabase = onCall(
  { ...callableSecurityOptions, secrets: [jwtSecret] },
  // eslint-disable-next-line complexity -- legacy emulator seed
  async (request) => {
    const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
    if (!isEmulator) {
      throw new HttpsError(
        "failed-precondition",
        "Seed de dados fica desabilitado fora do emulador."
      );
    }
    if (!request.auth || !isAdminClaims(request.auth.token)) {
      throw new HttpsError(
        "permission-denied",
        "Apenas administradores podem gerar dados de teste."
      );
    }
    const rateKey = request.auth?.uid || "anonymous";
    const allowedSeed = await checkRateLimit(`seed:${rateKey}`, 2);
    if (!allowedSeed) {
      throw new HttpsError(
        "resource-exhausted",
        "Muitas tentativas. Aguarde um momento e tente novamente."
      );
    }

    const db = getFirestore();
    const batch = db.batch();

    const eventRef1 = db.collection("events").doc();
    const organizerId = request.auth?.uid || "admin";
    batch.set(eventRef1, {
      title: "Festival de Rock 2024",
      description: "O maior festival de rock do ano!",
      date: "2024-12-25",
      time: "18:00",
      location: "Arena Central",
      address: "Av. Central, 1000 - São Paulo - SP",
      price: 150.0,
      maxTickets: 500,
      availableTickets: 500,
      inventory: { standard: 300, vip: 100, premium: 100 },
      pricing: { standard: 150, vip: 220, premium: 300 },
      category: "Música",
      organizerId,
      createdBy: organizerId,
      image: "https://placehold.co/600x400/png",
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
    });

    const purchaseRef = db.collection("purchases").doc();
    batch.set(purchaseRef, {
      userId: organizerId,
      eventId: eventRef1.id,
      paymentId: "mock_payment_123",
      status: "approved",
      items: [{ id: "ticket", quantity: 2, unit_price: 150 }],
      userEmail: request.auth?.token?.email || "user_test@example.com",
      createdAt: FieldValue.serverTimestamp(),
    });

    const secret =
      jwtSecret.value() || (isEmulator ? "default-dev-secret" : null);
    if (!secret) {
      throw new HttpsError("internal", "JWT_SECRET não configurado.");
    }

    for (let i = 0; i < 2; i += 1) {
      const ticketRef = db.collection("tickets").doc();
      const ticketPayload = {
        tid: ticketRef.id,
        eid: eventRef1.id,
        uid: organizerId,
        ts: Date.now() + i,
      };
      const signedToken = jwt.sign(ticketPayload, secret, {
        expiresIn: "365d",
      });
      batch.set(ticketRef, {
        userId: organizerId,
        eventId: eventRef1.id,
        purchaseId: purchaseRef.id,
        ticketType: "standard",
        price: 150,
        userEmail: request.auth?.token?.email || "user_test@example.com",
        qrCode: signedToken,
        validated: false,
        status: "valid",
        purchaseDate: FieldValue.serverTimestamp(),
        createdAt: FieldValue.serverTimestamp(),
      });
    }

    await batch.commit();
    return { message: "Database seeded successfully" };
  }
);
