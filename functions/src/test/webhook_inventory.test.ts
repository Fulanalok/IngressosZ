import { expect } from "chai";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import functionsTestLib from "firebase-functions-test";
import { Payment } from "mercadopago";
import { after, afterEach, before, describe, it } from "mocha";
import net from "net";

const functionsTest = functionsTestLib();

const parseHostPort = (value: string) => {
  const [host, port] = value.split(":");
  return { host: host || "127.0.0.1", port: Number(port) || 8086 };
};

const canConnect = (host: string, port: number) =>
  new Promise<boolean>((resolve) => {
    const socket = net.connect({ host, port }, () => {
      socket.destroy();
      resolve(true);
    });
    socket.setTimeout(500, () => {
      socket.destroy();
      resolve(false);
    });
    socket.on("error", () => {
      socket.destroy();
      resolve(false);
    });
  });

type WebhookRequest = {
  body: Record<string, any>;
  headers: Record<string, string>;
};

type WebhookResponse = {
  status: (code: number) => WebhookResponse;
  send: (payload: any) => WebhookResponse;
  json: (payload: any) => WebhookResponse;
  end: () => WebhookResponse;
};

type WebhookHandler = (req: WebhookRequest, res: WebhookResponse) => void;

process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST = process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8086";
process.env.FIREBASE_AUTH_EMULATOR_HOST = process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.JWT_SECRET = "test-secret";

describe("Webhook Inventory Logic", () => {
  let receiveWebhook: WebhookHandler | undefined;
  let originalPaymentGet: any;

  before(async function() {
    const { host, port } = parseHostPort(process.env.FIRESTORE_EMULATOR_HOST!);
    if (!(await canConnect(host, port))) {
      this.skip();
    }

    const mod = await import("../../lib/index.js");
    receiveWebhook = mod.receiveWebhook as unknown as WebhookHandler;
    originalPaymentGet = Payment.prototype.get;
  });

  after(() => {
    Payment.prototype.get = originalPaymentGet;
    functionsTest.cleanup();
  });

  it("rejeita a compra VIP quando o inventário VIP está esgotado mas Standard ainda tem estoque", async () => {
    const db = getFirestore();
    const eventRef = db.collection("events").doc();
    await eventRef.set({
      title: "Evento VIP Esgotado",
      availableTickets: 50, // standard ainda disponível no global
      inventory: { standard: 50, vip: 0 }, // VIP esgotado
      pricing: { standard: 100, vip: 200 },
      createdAt: FieldValue.serverTimestamp(),
    });

    const paymentId = "test-payment-vip-sold-out-" + Date.now();
    Payment.prototype.get = async () => ({
      id: paymentId,
      status: "approved",
      metadata: {
        eventId: eventRef.id,
        userId: "test-user-456",
        userEmail: "test2@example.com",
        ticketType: "vip",
      },
      additional_info: {
        items: [{ quantity: 1, unit_price: 200 }],
        payer: { email: "test2@example.com" }
      }
    } as any);

    const req = {
      body: { type: "payment", data: { id: paymentId } },
      headers: {}
    } as WebhookRequest;

    let resStatus = 0;
    const res = {
      status: (code: number) => { resStatus = code; return res; },
      send: () => res,
      json: () => res,
      end: () => res,
    } as WebhookResponse;

    await (receiveWebhook as any)(req, res);

    // O webhook ainda responde 200 (processa o evento) mas registra como oversold
    expect(resStatus).to.equal(200);

    // O inventário não deve ter sido decrementado
    const eventSnap = await eventRef.get();
    const eventData = eventSnap.data();
    expect(eventData?.inventory?.vip).to.equal(0);
    expect(eventData?.availableTickets).to.equal(50); // global intocado

    // Deve existir um documento de compra com status de oversold
    const purchases = await db.collection("purchases")
      .where("eventId", "==", eventRef.id)
      .where("status", "==", "refunded_oversold")
      .get();
    expect(purchases.empty).to.equal(false);
  });

  it("decrementa o inventário global e o específico (VIP) ao aprovar pagamento", async () => {
    const db = getFirestore();
    const eventRef = db.collection("events").doc();
    await eventRef.set({
      title: "Evento VIP Test",
      availableTickets: 100,
      inventory: { standard: 50, vip: 50 },
      pricing: { standard: 100, vip: 200 },
      createdAt: FieldValue.serverTimestamp(),
    });

    const paymentId = "test-payment-" + Date.now();
    Payment.prototype.get = async () => ({
      id: paymentId,
      status: "approved",
      metadata: {
        eventId: eventRef.id,
        userId: "test-user-123",
        userEmail: "test@example.com",
        ticketType: "vip",
      },
      additional_info: {
        items: [{ quantity: 2, unit_price: 200 }],
        payer: { email: "test@example.com" }
      }
    } as any);

    const req = {
      body: { type: "payment", data: { id: paymentId } },
      headers: {}
    } as WebhookRequest;

    let resStatus = 0;
    const res = {
      status: (code: number) => { resStatus = code; return res; },
      send: () => res,
      json: () => res,
      end: () => res,
    } as WebhookResponse;

    await (receiveWebhook as any)(req, res);

    expect(resStatus).to.equal(200);

    const eventSnap = await eventRef.get();
    const eventData = eventSnap.data();

    // 100 - 2 = 98 (global)
    expect(eventData?.availableTickets).to.equal(98);
    // 50 - 2 = 48 (VIP)
    expect(eventData?.inventory?.vip).to.equal(48);
    // standard deve permanecer 50
    expect(eventData?.inventory?.standard).to.equal(50);
  });
});
