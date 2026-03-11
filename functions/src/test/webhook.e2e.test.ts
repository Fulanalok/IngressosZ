const { describe, it, before, afterEach, after } = require("mocha");
const { expect } = require("chai");
const admin = require("firebase-admin");
const { Payment } = require("mercadopago");

process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8086";
process.env.JWT_SECRET = process.env.JWT_SECRET || "e2e-secret";
process.env.MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "e2e-token";
process.env.MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";
process.env.SMTP_EMAIL = process.env.SMTP_EMAIL || "";
process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";

describe("Webhook E2E (pagamento -> webhook -> tickets)", () => {
  let receiveWebhook;
  let originalGet;
  let stubPayment;
  let originalGetUser;
  const cleanupPaths: Array<{ path: string; id: string }> = [];

  const createDoc = async (path: string, data: Record<string, unknown>) => {
    const ref = admin.firestore().collection(path).doc();
    await ref.set(data);
    cleanupPaths.push({ path, id: ref.id });
    return ref;
  };

  const invokeWebhook = (body: Record<string, unknown>) =>
    new Promise<{ statusCode: number; payload: unknown }>((resolve) => {
      let statusCode = 200;
      const req = {
        body,
        headers: {},
      };
      const res = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        send: (payload: unknown) => resolve({ statusCode, payload }),
      };
      receiveWebhook(req, res);
    });

  before(() => {
    if (admin.apps.length === 0) {
      admin.initializeApp();
    }
    const mod = require("../../lib/index.js");
    receiveWebhook = mod.receiveWebhook;
    originalGet = Payment.prototype.get;
    Payment.prototype.get = async ({ id }: { id: string }) => {
      return {
        id,
        status: "approved",
        metadata: stubPayment.metadata,
        additional_info: stubPayment.additional_info,
        payer: { email: stubPayment.payerEmail },
      };
    };
    const auth = admin.auth();
    originalGetUser = auth.getUser;
    auth.getUser = async () => {
      return { email: stubPayment?.payerEmail || "" };
    };
  });

  afterEach(async () => {
    const tickets = await admin.firestore().collection("tickets").get();
    await Promise.all(tickets.docs.map((doc) => doc.ref.delete()));
    const purchases = await admin.firestore().collection("purchases").get();
    await Promise.all(purchases.docs.map((doc) => doc.ref.delete()));
    for (const item of cleanupPaths.splice(0)) {
      await admin.firestore().collection(item.path).doc(item.id).delete();
    }
  });

  after(() => {
    Payment.prototype.get = originalGet;
    if (originalGetUser) {
      const auth = admin.auth();
      auth.getUser = originalGetUser;
    }
  });

  it("processa pagamento aprovado e emite tickets", async () => {
    const eventRef = await createDoc("events", {
      title: "Evento E2E",
      price: 120,
      availableTickets: 10,
      date: "2024-12-25",
      time: "20:00",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const userEmail = "e2e.user@example.com";
    const userId = `e2e-user-${Date.now()}`;

    const paymentSessionRef = await createDoc("paymentSessions", {
      eventId: eventRef.id,
      userId,
      status: "pending",
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    const paymentId = `pay-${Date.now()}`;
    stubPayment = {
      payerEmail: userEmail,
      metadata: {
        eventId: eventRef.id,
        userId,
        userEmail,
        ticketType: "standard",
        paymentSessionId: paymentSessionRef.id,
      },
      additional_info: {
        items: [{ quantity: 2 }],
        payer: { email: userEmail },
      },
    };

    const { statusCode } = await invokeWebhook({
      type: "payment",
      data: { id: paymentId },
    });
    expect(statusCode).to.equal(200);

    const purchases = await admin
      .firestore()
      .collection("purchases")
      .where("paymentId", "==", paymentId)
      .get();
    expect(purchases.size).to.equal(1);
    const purchaseId = purchases.docs[0].id;

    const tickets = await admin
      .firestore()
      .collection("tickets")
      .where("purchaseId", "==", purchaseId)
      .get();
    expect(tickets.size).to.equal(2);

    const paymentSessionSnap = await paymentSessionRef.get();
    const paymentSession = paymentSessionSnap.data();
    expect(paymentSession?.status).to.equal("approved");
    expect(paymentSession?.paymentId).to.equal(paymentId);

    const eventSnap = await eventRef.get();
    const event = eventSnap.data();
    expect(event?.availableTickets).to.equal(8);
  });
});
