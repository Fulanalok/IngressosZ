import { expect } from "chai";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import functionsTestLib from "firebase-functions-test";
import { Payment } from "mercadopago";
import { after, afterEach, before, describe, it } from "mocha";
import net from "net";
import nodemailer from "nodemailer";

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
  body: Record<string, unknown>;
  headers: Record<string, string>;
};
type WebhookResponse = {
  status: (code: number) => WebhookResponse;
  send: (payload: unknown) => WebhookResponse;
  json: (payload: unknown) => WebhookResponse;
  end: () => WebhookResponse;
};
type WebhookHandler = (req: WebhookRequest, res: WebhookResponse) => void;
type PaymentGet = typeof Payment.prototype.get;
type GetUserByEmail = ReturnType<typeof getAuth>["getUserByEmail"];
type StubPayment = {
  payerEmail: string;
  metadata: {
    eventId: string;
    userId: string;
    userEmail: string;
    ticketType: string;
    paymentSessionId: string;
  };
  additional_info: {
    items: Array<{ quantity: number }>;
    payer: { email: string };
  };
};

process.env.FUNCTIONS_EMULATOR = "true";
process.env.FIRESTORE_EMULATOR_HOST =
  process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8086";
process.env.FIREBASE_AUTH_EMULATOR_HOST =
  process.env.FIREBASE_AUTH_EMULATOR_HOST || "127.0.0.1:9099";
process.env.JWT_SECRET = process.env.JWT_SECRET || "e2e-secret";
process.env.MP_ACCESS_TOKEN = process.env.MP_ACCESS_TOKEN || "e2e-token";
process.env.MP_WEBHOOK_SECRET = process.env.MP_WEBHOOK_SECRET || "";
process.env.SMTP_EMAIL = process.env.SMTP_EMAIL || "";
process.env.SMTP_PASSWORD = process.env.SMTP_PASSWORD || "";

describe("Webhook E2E (pagamento -> webhook -> tickets)", () => {
  let receiveWebhook: WebhookHandler | undefined;
  let originalGet: PaymentGet | undefined;
  let originalGetUser: GetUserByEmail | undefined;
  let originalCreateTransport: typeof nodemailer.createTransport | undefined;
  let stubPayment: StubPayment | null = null;
  const cleanupPaths: Array<{ path: string; id: string }> = [];

  const createDoc = async (path: string, data: Record<string, unknown>) => {
    const ref = getFirestore().collection(path).doc();
    await ref.set(data);
    cleanupPaths.push({ path, id: ref.id });
    return ref;
  };

  const invokeWebhook = (body: Record<string, unknown>) =>
    new Promise<{ statusCode: number; payload: unknown }>((resolve, reject) => {
      if (!receiveWebhook) {
        reject(new Error("receiveWebhook não inicializado"));
        return;
      }
      let statusCode = 200;
      const req: WebhookRequest = { body, headers: {} };
      const res: WebhookResponse = {
        status: (code: number) => {
          statusCode = code;
          return res;
        },
        send: (payload: unknown) => {
          resolve({ statusCode, payload });
          return res;
        },
        json: (payload: unknown) => {
          resolve({ statusCode, payload });
          return res;
        },
        end: () => {
          resolve({ statusCode, payload: "" });
          return res;
        },
      };

      try {
        receiveWebhook(req, res);
      } catch (err) {
        reject(err);
      }
    });

  before(async function () {
    const { host, port } = parseHostPort(
      process.env.FIRESTORE_EMULATOR_HOST || "127.0.0.1:8086"
    );
    const ready = await canConnect(host, port);
    if (!ready) {
      this.skip();
    }

    originalCreateTransport = nodemailer.createTransport;
    nodemailer.createTransport = (() => ({
      sendMail: async () => ({ messageId: "mock-id" }),
    })) as unknown as typeof nodemailer.createTransport;

    const mod = await import("../../lib/index.js");
    receiveWebhook = mod.receiveWebhook as unknown as WebhookHandler;
    originalGet = Payment.prototype.get;
    Payment.prototype.get = async ({ id }: { id: string }) => {
      if (!stubPayment) {
        throw new Error("Stub payment não configurado");
      }
      return {
        id,
        status: "approved",
        metadata: stubPayment.metadata,
        additional_info: stubPayment.additional_info,
        payer: { email: stubPayment.payerEmail },
      } as unknown as Awaited<ReturnType<PaymentGet>>;
    };
    const auth = getAuth();
    originalGetUser = auth.getUserByEmail;
    auth.getUserByEmail = async (email: string) => {
      return {
        uid: "e2e-user-id",
        email: email || stubPayment?.payerEmail || "",
      } as unknown as Awaited<ReturnType<GetUserByEmail>>;
    };
  });

  afterEach(async () => {
    try {
      const tickets = await getFirestore().collection("tickets").get();
      await Promise.all(tickets.docs.map((doc) => doc.ref.delete()));
      const purchases = await getFirestore().collection("purchases").get();
      await Promise.all(purchases.docs.map((doc) => doc.ref.delete()));
      for (const item of cleanupPaths.splice(0)) {
        await getFirestore().collection(item.path).doc(item.id).delete();
      }
    } catch (err) {
      console.warn("Error during cleanup:", err);
    }
  });

  after(() => {
    if (originalGet) {
      Payment.prototype.get = originalGet;
    }
    if (originalGetUser) {
      const auth = getAuth();
      auth.getUserByEmail = originalGetUser;
    }
    if (originalCreateTransport) {
      nodemailer.createTransport = originalCreateTransport;
    }
    functionsTest.cleanup();
  });

  it("processa pagamento aprovado e emite tickets", async () => {
    const eventRef = await createDoc("events", {
      title: "Evento E2E",
      price: 120,
      availableTickets: 10,
      date: "2024-12-25",
      time: "20:00",
      createdAt: FieldValue.serverTimestamp(),
    });
    const userEmail = "e2e.user@example.com";
    const userId = `e2e-user-${Date.now()}`;

    const paymentSessionRef = await createDoc("paymentSessions", {
      eventId: eventRef.id,
      userId,
      status: "pending",
      createdAt: FieldValue.serverTimestamp(),
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

    const purchases = await getFirestore()
      .collection("purchases")
      .where("paymentId", "==", paymentId)
      .get();
    expect(purchases.size).to.equal(1);
    const purchaseId = purchases.docs[0].id;

    const tickets = await getFirestore()
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
