import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import jwt from "jsonwebtoken";
import { jwtSecret } from "../config/params.js";

export const seedDatabase = onCall(
  { secrets: [jwtSecret] },
  async (request) => {
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

    const isEmulatorSeed = process.env.FUNCTIONS_EMULATOR === "true";
    const secret =
      jwtSecret.value() || (isEmulatorSeed ? "default-dev-secret" : null);
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
