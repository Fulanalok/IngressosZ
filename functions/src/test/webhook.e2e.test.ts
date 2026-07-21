import { expect } from "chai";
import { getApps, initializeApp } from "firebase-admin/app";
import { FieldValue, getFirestore, Timestamp } from "firebase-admin/firestore";
import { after, before, beforeEach, describe, it } from "mocha";
import type {
  PaymentFulfillmentDependencies,
  ProviderPayment,
} from "../../lib/domain/paymentFulfillment.js";
import {
  processProviderPayment,
  stableWebhookDocumentId,
} from "../../lib/domain/paymentFulfillment.js";
import { createFirestorePaymentFulfillmentRepository } from
  "../../lib/infrastructure/paymentFulfillmentFirestore.js";
import { sendPurchaseEmail } from "../../lib/endpoints/email.js";

process.env.GCLOUD_PROJECT = process.env.GCLOUD_PROJECT || "demo-ingressosz";
process.env.GOOGLE_CLOUD_PROJECT =
  process.env.GOOGLE_CLOUD_PROJECT || "demo-ingressosz";

const nowMillis = Date.parse("2026-07-20T12:00:00.000Z");
const collectionNames = [
  "paymentWebhookEvents",
  "paymentSessions",
  "purchases",
  "tickets",
  "events",
];

describe("Webhook Integration Tests", () => {
  let emailCalls = 0;

  before(() => {
    if (!process.env.FIRESTORE_EMULATOR_HOST) {
      throw new Error(
        "FIRESTORE_EMULATOR_HOST ausente; execute npm run test:webhook na raiz."
      );
    }
    if (!getApps().length) initializeApp({ projectId: "demo-ingressosz" });
  });

  beforeEach(async () => {
    const db = getFirestore();
    for (const name of collectionNames) {
      const snapshot = await db.collection(name).get();
      await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
    }
    emailCalls = 0;
  });

  after(async () => {
    const db = getFirestore();
    for (const name of collectionNames) {
      const snapshot = await db.collection(name).get();
      await Promise.all(snapshot.docs.map((document) => document.ref.delete()));
    }
  });

  function dependencies(): PaymentFulfillmentDependencies {
    return {
      repository: createFirestorePaymentFulfillmentRepository(getFirestore()),
      now: () => nowMillis,
      createPurchaseId: (paymentId) =>
        stableWebhookDocumentId("purchase", paymentId),
      createTicketId: (paymentId, index) =>
        stableWebhookDocumentId("ticket", `${paymentId}:${index}`),
      signTicket: ({ ticketId }) => `signed-${ticketId}`,
      sendPurchaseEmail: async () => {
        emailCalls += 1;
      },
      logger: {
        info: () => undefined,
        warn: () => undefined,
        error: () => undefined,
      },
    };
  }

  async function seed(options: {
    sessionId?: string;
    eventId?: string;
    availableTickets?: number;
    inventory?: Record<string, number>;
    session?: Record<string, unknown>;
  } = {}) {
    const db = getFirestore();
    const eventId = options.eventId ?? "event-1";
    const sessionId = options.sessionId ?? "session-1";
    await db.collection("events").doc(eventId).set({
      title: "Evento confiavel",
      date: "2026-12-10",
      time: "20:00",
      availableTickets: options.availableTickets ?? 10,
      ...(options.inventory ? { inventory: options.inventory } : {}),
      updatedAt: Timestamp.fromMillis(nowMillis),
    });
    await db.collection("paymentSessions").doc(sessionId).set({
      eventId,
      userId: "buyer-1",
      userEmail: "buyer@example.com",
      ticketType: "vip",
      quantity: 2,
      unitPrice: 12.34,
      totalAmount: 24.68,
      paymentMethod: "checkout",
      provider: "mercadopago",
      providerState: "created",
      status: "pending",
      createdAt: Timestamp.fromMillis(nowMillis - 1000),
      updatedAt: Timestamp.fromMillis(nowMillis - 1000),
      ...options.session,
    });
    return { eventId, sessionId };
  }

  function payment(
    paymentId: string,
    sessionId = "session-1",
    overrides: Partial<ProviderPayment> = {}
  ): ProviderPayment {
    return {
      id: paymentId,
      status: "approved",
      transaction_amount: 24.68,
      currency_id: "BRL",
      external_reference: sessionId,
      metadata: { paymentSessionId: sessionId },
      ...overrides,
    };
  }

  async function invoke(
    paymentId: string,
    sessionId = "session-1",
    overrides: Partial<ProviderPayment> = {}
  ) {
    return processProviderPayment(
      paymentId,
      payment(paymentId, sessionId, overrides),
      dependencies()
    );
  }

  it("processa compra usando apenas a paymentSession", async () => {
    await seed({ inventory: { vip: 4, standard: 6 } });
    const result = await invoke("payment-1", "session-1", {
      metadata: {
        paymentSessionId: "session-1",
        eventId: "attacker-event",
        userId: "attacker",
        userEmail: "attacker@example.com",
        ticketType: "premium",
        quantity: 999,
      },
    });

    expect(result.outcome).to.equal("processed");
    const db = getFirestore();
    const purchases = await db.collection("purchases").get();
    const tickets = await db.collection("tickets").get();
    const event = (await db.collection("events").doc("event-1").get()).data();
    const sessionData = (
      await db.collection("paymentSessions").doc("session-1").get()
    ).data();
    const webhookEvent = (
      await db.collection("paymentWebhookEvents").doc("payment-1").get()
    ).data();
    expect(purchases.size).to.equal(1);
    expect(tickets.size).to.equal(2);
    expect(tickets.docs.map((ticket) => ticket.data().price)).to.deep.equal([
      12.34,
      12.34,
    ]);
    expect(tickets.docs.every((ticket) =>
      ticket.data().userId === "buyer-1" &&
      ticket.data().ticketType === "vip"
    )).to.equal(true);
    expect(event?.availableTickets).to.equal(8);
    expect(event?.inventory.vip).to.equal(2);
    expect(sessionData).to.include({
      status: "approved",
      providerState: "created",
      paymentId: "payment-1",
    });
    expect(webhookEvent?.outcome).to.equal("processed");
    expect(emailCalls).to.equal(1);
  });

  it("pending repetido nao produz efeitos e approved posterior processa uma vez", async () => {
    await seed();
    const first = await invoke("payment-transition", "session-1", {
      status: "pending",
    });
    const second = await invoke("payment-transition", "session-1", {
      status: "pending",
    });
    expect(first).to.include({
      outcome: "ignored_not_approved",
      newlyProcessed: false,
    });
    expect(second).to.include({
      outcome: "ignored_not_approved",
      newlyProcessed: false,
    });
    const db = getFirestore();
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-transition").get()).exists).to.equal(false);
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()?.status).to.equal("pending");
    expect((await db.collection("purchases").get()).empty).to.equal(true);
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(10);
    expect(emailCalls).to.equal(0);

    expect((await invoke("payment-transition")).outcome).to.equal("processed");
    await invoke("payment-transition");
    expect((await db.collection("purchases").get()).size).to.equal(1);
    expect((await db.collection("tickets").get()).size).to.equal(2);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(8);
    expect(emailCalls).to.equal(1);
  });

  it("rejected seguido de approved permanece processavel", async () => {
    await seed();
    expect((await invoke("payment-rejected", "session-1", {
      status: "rejected",
    })).outcome).to.equal("ignored_not_approved");
    expect((await getFirestore().collection("paymentWebhookEvents")
      .doc("payment-rejected").get()).exists).to.equal(false);
    expect((await invoke("payment-rejected")).outcome).to.equal("processed");
    expect((await getFirestore().collection("tickets").get()).size).to.equal(2);
  });

  it("outcome processed prevalece sobre notificacao posterior nao aprovada", async () => {
    await seed();
    await invoke("payment-terminal");
    const result = await invoke("payment-terminal", "session-1", {
      status: "pending",
    });
    expect(result).to.include({ outcome: "processed", newlyProcessed: false });
    const db = getFirestore();
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()?.status).to.equal("approved");
    expect((await db.collection("purchases").get()).size).to.equal(1);
    expect((await db.collection("tickets").get()).size).to.equal(2);
    expect(emailCalls).to.equal(1);
  });

  it("reconcilia compra approved legada sem repetir efeitos", async () => {
    await seed({ availableTickets: 8 });
    const db = getFirestore();
    await db.collection("purchases").doc("legacy-approved").set({
      paymentId: "payment-legacy-approved",
      status: "approved",
      eventId: "event-1",
      userId: "buyer-1",
    });
    await Promise.all([0, 1].map((index) =>
      db.collection("tickets").doc(`legacy-ticket-${index}`).set({
        paymentId: "payment-legacy-approved",
        purchaseId: "legacy-approved",
        eventId: "event-1",
        userId: "buyer-1",
      })
    ));

    const result = await invoke("payment-legacy-approved");
    expect(result).to.include({
      outcome: "processed",
      purchaseId: "legacy-approved",
      newlyProcessed: false,
    });
    expect((await db.collection("purchases").get()).size).to.equal(1);
    expect((await db.collection("tickets").get()).size).to.equal(2);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(8);
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()).to.include({
      status: "approved",
      providerState: "created",
      paymentId: "payment-legacy-approved",
      purchaseId: "legacy-approved",
    });
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-legacy-approved").get()).data()).to.include({
      outcome: "processed",
      purchaseId: "legacy-approved",
      reason: "legacy_purchase_reconciled",
    });
    expect(emailCalls).to.equal(0);
  });

  for (const legacyCase of [
    { name: "sem providerState", missingField: "providerState" },
    { name: "sem paymentMethod", missingField: "paymentMethod" },
    { name: "sem o evento atual", missingField: "event" },
  ]) {
    it(`reconcilia compra approved legada ${legacyCase.name}`, async () => {
      await seed({ availableTickets: 8 });
      const db = getFirestore();
      if (legacyCase.missingField === "event") {
        await db.collection("events").doc("event-1").delete();
      } else {
        await db.collection("paymentSessions").doc("session-1").update({
          [legacyCase.missingField]: FieldValue.delete(),
        });
      }
      await db.collection("purchases").doc("legacy-approved").set({
        paymentId: "payment-legacy-schema",
        status: "approved",
        eventId: "event-1",
        userId: "buyer-1",
      });

      const result = await invoke("payment-legacy-schema");
      expect(result).to.include({
        outcome: "processed",
        purchaseId: "legacy-approved",
        newlyProcessed: false,
      });
      expect((await db.collection("purchases").get()).size).to.equal(1);
      expect((await db.collection("tickets").get()).empty).to.equal(true);
      if (legacyCase.missingField !== "event") {
        expect((await db.collection("events").doc("event-1").get())
          .data()?.availableTickets).to.equal(8);
      }
      expect((await db.collection("paymentWebhookEvents")
        .doc("payment-legacy-schema").get()).data()?.outcome)
        .to.equal("processed");
      expect(emailCalls).to.equal(0);
    });
  }

  it("nao reconcilia compra legada quando o valor diverge", async () => {
    await seed();
    const db = getFirestore();
    await db.collection("purchases").doc("legacy-amount").set({
      paymentId: "payment-legacy-amount",
      status: "approved",
      eventId: "event-1",
      userId: "buyer-1",
    });
    const result = await invoke("payment-legacy-amount", "session-1", {
      transaction_amount: 20,
    });
    expect(result.outcome).to.equal("refund_required_amount_mismatch");
    expect((await db.collection("purchases").doc("legacy-amount").get())
      .data()?.status).to.equal("approved");
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-legacy-amount").get()).data()).to.include({
      outcome: "refund_required_amount_mismatch",
      reason: "amount_mismatch",
    });
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect(emailCalls).to.equal(0);
  });

  it("reconcilia quantidade legada acima do limite sem novos tickets", async () => {
    await seed({
      availableTickets: 4,
      session: { quantity: 6, unitPrice: 4, totalAmount: 24 },
    });
    const db = getFirestore();
    await db.collection("purchases").doc("legacy-quantity").set({
      paymentId: "payment-legacy-quantity",
      status: "approved",
      eventId: "event-1",
      userId: "buyer-1",
      items: [{ ticketType: "vip", quantity: 6 }],
    });
    const result = await invoke("payment-legacy-quantity", "session-1", {
      transaction_amount: 24,
    });
    expect(result).to.include({
      outcome: "processed",
      purchaseId: "legacy-quantity",
      newlyProcessed: false,
    });
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(4);
    expect(emailCalls).to.equal(0);
  });

  it("reconcilia refunded_oversold legado sem tickets ou estoque", async () => {
    await seed({ availableTickets: 1 });
    const db = getFirestore();
    await db.collection("purchases").doc("legacy-oversold").set({
      paymentId: "payment-legacy-oversold",
      paymentSessionId: "session-1",
      status: "refunded_oversold",
      eventId: "event-1",
      userId: "buyer-1",
    });
    const result = await invoke("payment-legacy-oversold");
    expect(result).to.include({
      outcome: "refund_required_oversold",
      newlyProcessed: false,
    });
    expect((await db.collection("purchases").doc("legacy-oversold").get())
      .data()?.status).to.equal("refund_required_oversold");
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(1);
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()).to.include({ status: "refund_required", refundReason: "oversold" });
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-legacy-oversold").get()).data()?.outcome).to.equal(
      "refund_required_oversold"
    );
  });

  it("multiplas compras legadas registram conflito sem novo fulfillment", async () => {
    await seed();
    const db = getFirestore();
    await Promise.all(["legacy-a", "legacy-b"].map((purchaseId) =>
      db.collection("purchases").doc(purchaseId).set({
        paymentId: "payment-legacy-conflict",
        status: "approved",
        eventId: "event-1",
        userId: "buyer-1",
      })
    ));
    const result = await invoke("payment-legacy-conflict");
    expect(result.outcome).to.equal("refund_required_duplicate");
    expect((await db.collection("purchases").get()).size).to.equal(2);
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(10);
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()?.status).to.equal("pending");
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-legacy-conflict").get()).data()).to.include({
      outcome: "refund_required_duplicate",
      reason: "multiple_legacy_purchases",
    });
    expect(emailCalls).to.equal(0);
  });

  it("repete o mesmo paymentId sem duplicar efeitos ou email", async () => {
    await seed();
    await invoke("payment-repeat");
    await invoke("payment-repeat");
    const db = getFirestore();
    expect((await db.collection("purchases").get()).size).to.equal(1);
    expect((await db.collection("tickets").get()).size).to.equal(2);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(8);
    expect(emailCalls).to.equal(1);
  });

  it("duas invocacoes concorrentes produzem um unico fulfillment", async () => {
    await seed();
    const results = await Promise.all([
      invoke("payment-concurrent"),
      invoke("payment-concurrent"),
    ]);
    expect(results.map((result) => result.outcome)).to.deep.equal([
      "processed",
      "processed",
    ]);
    const db = getFirestore();
    expect((await db.collection("purchases").get()).size).to.equal(1);
    expect((await db.collection("tickets").get()).size).to.equal(2);
    expect(emailCalls).to.equal(1);
  });

  it("sessao inexistente registra outcome terminal sem efeitos", async () => {
    const result = await invoke("payment-missing", "missing-session");
    expect(result.outcome).to.equal("refund_required_invalid_session");
    const db = getFirestore();
    expect((await db.collection("purchases").get()).empty).to.equal(true);
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-missing").get()).data()?.reason).to.equal(
      "session_not_found"
    );
  });

  it("amount mismatch nao aprova compra nem emite tickets", async () => {
    await seed();
    const result = await invoke("payment-amount", "session-1", {
      transaction_amount: 20,
    });
    expect(result.outcome).to.equal("refund_required_amount_mismatch");
    const db = getFirestore();
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()?.status).to.equal("refund_required");
  });

  it("schema novo incompleto continua bloqueado sem compra legada", async () => {
    await seed();
    const db = getFirestore();
    await db.collection("paymentSessions").doc("session-1").update({
      providerState: FieldValue.delete(),
    });
    const result = await invoke("payment-incomplete");
    expect(result.outcome).to.equal("refund_required_invalid_session");
    expect((await db.collection("purchases").get()).empty).to.equal(true);
    expect((await db.collection("tickets").get()).empty).to.equal(true);
  });

  it("quantidade acima do limite nao inicia criacao de tickets", async () => {
    await seed({
      session: { quantity: 6, unitPrice: 4, totalAmount: 24 },
    });
    const result = await invoke("payment-quantity", "session-1", {
      transaction_amount: 24,
    });
    expect(result.outcome).to.equal("refund_required_invalid_session");
    const db = getFirestore();
    expect((await db.collection("purchases").get()).empty).to.equal(true);
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(10);
  });

  it("oversell cria auditoria honesta sem alterar estoque", async () => {
    await seed({ availableTickets: 1 });
    const result = await invoke("payment-oversell");
    expect(result.outcome).to.equal("refund_required_oversold");
    const db = getFirestore();
    const purchase = (await db.collection("purchases").get()).docs[0].data();
    expect(purchase.status).to.equal("refund_required_oversold");
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(1);
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()).to.include({ status: "refund_required", refundReason: "oversold" });
  });

  it("segundo paymentId exige reembolso e preserva compra original", async () => {
    await seed();
    await invoke("payment-original");
    const duplicate = await invoke("payment-duplicate");
    expect(duplicate.outcome).to.equal("refund_required_duplicate");
    const db = getFirestore();
    expect((await db.collection("purchases").get()).size).to.equal(1);
    expect((await db.collection("tickets").get()).size).to.equal(2);
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()?.paymentId).to.equal("payment-original");
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-duplicate").get()).data()?.outcome).to.equal(
      "refund_required_duplicate"
    );
  });

  it("paymentId duplicado nao substitui a identidade original da sessao", async () => {
    await seed({
      session: {
        paymentMethod: "pix",
        providerState: "created",
        paymentId: "payment-original-pix",
      },
    });
    const duplicate = await invoke("payment-duplicate-pix");
    expect(duplicate.outcome).to.equal("refund_required_duplicate");
    const db = getFirestore();
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()).to.include({
      status: "pending",
      providerState: "created",
      paymentId: "payment-original-pix",
    });

    expect((await invoke("payment-original-pix")).outcome)
      .to.equal("processed");
    expect((await db.collection("purchases").get()).size).to.equal(1);
    expect((await db.collection("tickets").get()).size).to.equal(2);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(8);
    expect(emailCalls).to.equal(1);
  });

  it("trigger de ticket usa quantidade total e envia email uma vez", async () => {
    const db = getFirestore();
    await db.collection("purchases").doc("purchase-email").set({
      userId: "buyer-1",
      eventId: "event-1",
      items: [{ ticketType: "vip", quantity: 3 }],
    });
    const deliveries: number[] = [];
    const emailDependencies = {
      getDb: () => db,
      deliver: async (_userId, _eventId, ticketsCount) => {
        deliveries.push(ticketsCount);
      },
    };
    const triggerFallback = { userId: "buyer-1", eventId: "event-1" };
    await Promise.all([
      sendPurchaseEmail("purchase-email", triggerFallback, emailDependencies),
      sendPurchaseEmail("purchase-email", triggerFallback, emailDependencies),
    ]);
    await sendPurchaseEmail(
      "purchase-email",
      triggerFallback,
      emailDependencies
    );

    expect(deliveries).to.deep.equal([3]);
    expect((await db.collection("purchases").doc("purchase-email").get())
      .data()?.emailSent).to.equal(true);
  });

  it("external_reference funciona sem PII no metadata", async () => {
    await seed();
    const result = await invoke("payment-external", "session-1", {
      metadata: { paymentSessionId: "session-1" },
    });
    expect(result.outcome).to.equal("processed");
  });

  it("metadata legado localiza sessao sem external_reference", async () => {
    await seed();
    const result = await invoke("payment-legacy", "session-1", {
      external_reference: null,
      metadata: { payment_session_id: "session-1" },
    });
    expect(result.outcome).to.equal("processed");
  });

  it("processa expired created e registra aprovacao depois do prazo", async () => {
    const expiredAt = Timestamp.fromMillis(nowMillis - 5000);
    await seed({
      session: {
        status: "expired",
        providerState: "created",
        expiresAt: Timestamp.fromMillis(nowMillis - 10000),
        expiredAt,
        expirationReason: "provider_not_started",
      },
    });
    const first = await invoke("payment-late-created");
    const replay = await invoke("payment-late-created");
    expect(first.outcome).to.equal("processed");
    expect(replay).to.include({ outcome: "processed", newlyProcessed: false });

    const db = getFirestore();
    const sessionData = (await db.collection("paymentSessions")
      .doc("session-1").get()).data();
    const purchase = (await db.collection("purchases").get()).docs[0].data();
    const webhookEvent = (await db.collection("paymentWebhookEvents")
      .doc("payment-late-created").get()).data();
    expect(sessionData).to.include({
      status: "approved",
      approvedAfterInitiationExpiry: true,
      expirationReason: "provider_not_started",
    });
    expect(sessionData?.expiredAt.toMillis()).to.equal(expiredAt.toMillis());
    expect(purchase.approvedAfterInitiationExpiry).to.equal(true);
    expect(webhookEvent?.approvedAfterInitiationExpiry).to.equal(true);
    expect((await db.collection("tickets").get()).size).to.equal(2);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(8);
    expect(emailCalls).to.equal(1);
  });

  it("marca pending created aprovado depois de expiresAt", async () => {
    await seed({
      session: {
        expiresAt: Timestamp.fromMillis(nowMillis - 1),
        providerState: "created",
      },
    });
    expect((await invoke("payment-late-pending")).outcome).to.equal("processed");
    const db = getFirestore();
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()?.approvedAfterInitiationExpiry).to.equal(true);
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-late-pending").get()).data()
      ?.approvedAfterInitiationExpiry).to.equal(true);
  });

  for (const providerState of ["failed", "creating"]) {
    it(`processa expired ${providerState} quando o webhook e valido`, async () => {
      await seed({
        session: {
          status: "expired",
          providerState,
          expiresAt: Timestamp.fromMillis(nowMillis - 1000),
          ...(providerState === "creating" ? {
            providerStartedAt: Timestamp.fromMillis(nowMillis - 10000),
          } : {}),
        },
      });
      expect((await invoke(`payment-expired-${providerState}`)).outcome)
        .to.equal("processed");
      const db = getFirestore();
      expect((await db.collection("paymentSessions").doc("session-1").get())
        .data()).to.include({
        status: "approved",
        approvedAfterInitiationExpiry: true,
      });
      expect((await db.collection("tickets").get()).size).to.equal(2);
    });
  }

  it("rejeita expired ready sem alterar estoque ou criar efeitos", async () => {
    await seed({
      session: {
        status: "expired",
        providerState: "ready",
        expiresAt: Timestamp.fromMillis(nowMillis - 1000),
      },
    });
    const result = await invoke("payment-expired-ready");
    expect(result.outcome).to.equal("refund_required_invalid_session");
    const db = getFirestore();
    expect((await db.collection("purchases").get()).empty).to.equal(true);
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(10);
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-expired-ready").get()).data()).to.include({
      outcome: "refund_required_invalid_session",
      reason: "expired_without_provider_attempt",
    });
  });

  it("marca aprovacao tardia com oversell", async () => {
    await seed({
      availableTickets: 1,
      session: {
        status: "expired",
        providerState: "created",
        expiresAt: Timestamp.fromMillis(nowMillis - 1000),
      },
    });
    expect((await invoke("payment-late-oversold")).outcome)
      .to.equal("refund_required_oversold");
    const db = getFirestore();
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()).to.include({
      status: "refund_required",
      approvedAfterInitiationExpiry: true,
    });
    expect((await db.collection("purchases").get()).docs[0].data())
      .to.include({
        status: "refund_required_oversold",
        approvedAfterInitiationExpiry: true,
      });
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-late-oversold").get()).data()
      ?.approvedAfterInitiationExpiry).to.equal(true);
  });

  it("nao grava indicador para aprovacao dentro do prazo", async () => {
    await seed({
      session: { expiresAt: Timestamp.fromMillis(nowMillis + 1000) },
    });
    await invoke("payment-on-time");
    const db = getFirestore();
    for (const data of [
      (await db.collection("paymentSessions").doc("session-1").get()).data(),
      (await db.collection("purchases").get()).docs[0].data(),
      (await db.collection("paymentWebhookEvents")
        .doc("payment-on-time").get()).data(),
    ]) {
      expect(data).not.to.have.property("approvedAfterInitiationExpiry");
    }
  });

  it("reconcilia compra legada tardia sem duplicar efeitos", async () => {
    await seed({
      availableTickets: 8,
      session: {
        status: "expired",
        providerState: "created",
        expiresAt: Timestamp.fromMillis(nowMillis - 1000),
      },
    });
    const db = getFirestore();
    await db.collection("purchases").doc("legacy-late").set({
      paymentId: "payment-legacy-late",
      status: "approved",
      eventId: "event-1",
      userId: "buyer-1",
    });
    const result = await invoke("payment-legacy-late");
    expect(result).to.include({
      outcome: "processed",
      purchaseId: "legacy-late",
      newlyProcessed: false,
    });
    expect((await db.collection("purchases").get()).size).to.equal(1);
    expect((await db.collection("purchases").doc("legacy-late").get())
      .data()?.approvedAfterInitiationExpiry).to.equal(true);
    expect((await db.collection("tickets").get()).empty).to.equal(true);
    expect((await db.collection("events").doc("event-1").get())
      .data()?.availableTickets).to.equal(8);
    expect(emailCalls).to.equal(0);
  });

  it("reconstroi auditoria tardia de sessao ja approved", async () => {
    await seed({
      session: {
        status: "approved",
        providerState: "created",
        paymentId: "payment-approved-late",
        purchaseId: "purchase-approved-late",
        expiresAt: Timestamp.fromMillis(nowMillis - 1000),
      },
    });
    const db = getFirestore();
    await db.collection("purchases").doc("purchase-approved-late").set({
      paymentId: "payment-approved-late",
      status: "approved",
      eventId: "event-1",
      userId: "buyer-1",
    });
    const result = await invoke("payment-approved-late");
    expect(result).to.include({ outcome: "processed", newlyProcessed: false });
    expect((await db.collection("paymentSessions").doc("session-1").get())
      .data()?.approvedAfterInitiationExpiry).to.equal(true);
    expect((await db.collection("purchases").doc("purchase-approved-late").get())
      .data()?.approvedAfterInitiationExpiry).to.equal(true);
    expect((await db.collection("paymentWebhookEvents")
      .doc("payment-approved-late").get()).data()
      ?.approvedAfterInitiationExpiry).to.equal(true);
  });

  it("falha antes do commit deixa a sessao repetivel e sem processing", async () => {
    await seed();
    const failingDependencies = dependencies();
    failingDependencies.repository = {
      fulfill: async () => {
        throw new Error("firestore unavailable");
      },
    };
    try {
      await processProviderPayment(
        "payment-retry",
        payment("payment-retry"),
        failingDependencies
      );
      expect.fail("deveria falhar");
    } catch (error) {
      expect((error as Error).message).to.equal("firestore unavailable");
    }
    const db = getFirestore();
    const sessionData = (
      await db.collection("paymentSessions").doc("session-1").get()
    ).data();
    expect(sessionData?.status).to.equal("pending");
    expect(sessionData?.status).not.to.equal("processing");
    expect((await invoke("payment-retry")).outcome).to.equal("processed");
  });
});
