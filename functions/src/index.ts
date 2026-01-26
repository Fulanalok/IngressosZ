import { randomUUID } from "crypto";
import dotenv from "dotenv"; // Load .env files in local development
import * as admin from "firebase-admin";
import { FieldValue, Timestamp } from "firebase-admin/firestore";
import * as functions from "firebase-functions";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";

dotenv.config();
dotenv.config({ path: ".env.local" });
admin.initializeApp();

const firestore = admin.firestore();

const RUNNING_ON_EMULATOR =
  (process.env.FUNCTIONS_EMULATOR || "false").toLowerCase() === "true";
const USING_FIRESTORE_EMULATOR = Boolean(process.env.FIRESTORE_EMULATOR_HOST);
const USING_AUTH_EMULATOR = Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST);
const ENABLE_PROD_FUNCTIONS =
  (process.env.ENABLE_PROD_FUNCTIONS || "false").toLowerCase() === "true";

const OFFLINE_TICKETS = [
  { code: "TICKET-1756219017406-fh2k739l1", status: "active" },
  { code: "TICKET-JT1ZHCGOVQYIECOUAZCF", status: "active" },
  { code: "TICKET-1756219017407-usado123", status: "used" },
  { code: "TICKET-1756295230187-lxfcondum", status: "active" },
];

const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map((s) => s.trim())
  .filter(Boolean);
const DEFAULT_ORIGIN = process.env.FRONTEND_URL || "https://localhost:5173";

// Mercado Pago configuration
// Em produção, o token DEVE vir via variável de ambiente.
// Em emulador, tenta ler do .env, caso contrário falha (removido token hardcoded por segurança).
const mpAccessToken = process.env.MERCADOPAGO_ACCESS_TOKEN || "";

if (!mpAccessToken && RUNNING_ON_EMULATOR) {
  console.warn(
    "AVISO: MERCADOPAGO_ACCESS_TOKEN não configurado no emulador. Pagamentos falharão."
  );
}

const mpClient = mpAccessToken
  ? new MercadoPagoConfig({ accessToken: mpAccessToken })
  : null;

function setCors(req: any, res: any) {
  const origin = (req.headers["origin"] as string) || DEFAULT_ORIGIN;
  const allowOrigin = ALLOWED_ORIGINS.length
    ? ALLOWED_ORIGINS.includes(origin)
      ? origin
      : ALLOWED_ORIGINS[0]
    : DEFAULT_ORIGIN;
  res.set("Access-Control-Allow-Origin", allowOrigin);
  res.set("Vary", "Origin");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");
  res.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return true;
  }
  return false;
}

async function verifyAuth(req: any) {
  const auth = (req.headers["authorization"] || "") as string;
  const token = auth.startsWith("Bearer ") ? auth.substring(7) : null;
  if (!token) throw new Error("Missing Authorization");
  return admin.auth().verifyIdToken(token);
}

function getClientIp(req: any): string {
  const xfwd = req.headers["x-forwarded-for"] as string | undefined;
  if (xfwd) return xfwd.split(",")[0].trim();
  return (
    (req.ip as string) || (req.connection?.remoteAddress as string) || "unknown"
  );
}

// Rate limit simples (por usuário e endpoint) usando Firestore
// Janela de 60s, máximo configurável
async function checkRateLimit(
  userId: string,
  endpointKey: string,
  maxPerWindow: number
): Promise<boolean> {
  const key = `${endpointKey}:${userId}`;
  const ref = firestore.collection("rate_limits").doc(key);
  return firestore.runTransaction(async (tx: admin.firestore.Transaction) => {
    const snap = await tx.get(ref);
    const now = Timestamp.now();
    const windowSec = 60;
    const max = Math.max(1, Number(maxPerWindow) || 10);

    if (!snap.exists) {
      tx.set(ref, { count: 1, windowStart: now });
      return true;
    }
    const data = snap.data() as any;
    const windowStart: Timestamp = data?.windowStart || now;
    const count: number = Number(data?.count || 0);
    const elapsed = now.seconds - windowStart.seconds;
    if (elapsed >= windowSec) {
      tx.update(ref, { count: 1, windowStart: now });
      return true;
    }
    if (count + 1 > max) {
      return false;
    }
    tx.update(ref, { count: count + 1 });
    return true;
  });
}

/**
 * Mercado Pago: Create Preference (Checkout Pro)
 * - Server-authoritative pricing for ticketType: standard(50), vip(150), premium(300)
 * - Creates a Firestore order and uses its ID as external_reference
 */
export const mercadoPagoCreatePreference = functions.https.onRequest(
  async (req: functions.https.Request, res: any) => {
    if (setCors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      if (!RUNNING_ON_EMULATOR && !ENABLE_PROD_FUNCTIONS) {
        res.status(403).json({
          error: "Endpoint disponível apenas em desenvolvimento (emulador)",
        });
        return;
      }
      if (!mpClient) {
        res.status(500).json({
          error:
            "Mercado Pago não configurado (MERCADOPAGO_ACCESS_TOKEN ausente)",
        });
        return;
      }
      const ip = getClientIp(req);
      const allowedIp = await checkRateLimit(ip, "createPreference:ip", 60);
      if (!allowedIp) {
        res.status(429).json({
          error: "Muitas requisições deste IP. Tente novamente mais tarde.",
        });
        return;
      }

      const user = await verifyAuth(req);
      const allowedUser = await checkRateLimit(
        user.uid,
        "createPreference",
        30
      );
      if (!allowedUser) {
        res.status(429).json({
          error:
            "Muitas requisições de criação de preferência. Tente novamente mais tarde.",
        });
        return;
      }

      const { eventId, ticketType, quantity = 1, userEmail } = req.body || {};
      if (!eventId || !ticketType) {
        res
          .status(400)
          .json({ error: "Campos obrigatórios: eventId, ticketType" });
        return;
      }
      const normalizedType = String(ticketType).toLowerCase();
      const validTypes = ["standard", "vip", "premium"];
      if (!validTypes.includes(normalizedType)) {
        res
          .status(400)
          .json({ error: `Tipo de ingresso inválido: ${ticketType}` });
        return;
      }
      // Buscar evento para obter preços/estoque por evento
      const eventRef = firestore.collection("events").doc(String(eventId));
      const eventSnap = await eventRef.get();
      if (!eventSnap.exists) {
        res.status(404).json({ error: "Evento não encontrado" });
        return;
      }
      const eventData = eventSnap.data() as any;

      // Lógica de Preço:
      // 1. Preço explícito no mapa 'pricing' do evento
      // 2. Preço base do evento * multiplicador do tipo
      // 3. Fallback para valores hardcoded

      const MULTIPLIERS: Record<string, number> = {
        standard: 1,
        vip: 2,
        premium: 3,
      };

      let unitPrice: number | undefined;

      // 1. Tentar pricing explícito
      if (
        eventData?.pricing &&
        typeof eventData.pricing === "object" &&
        typeof eventData.pricing[normalizedType] === "number"
      ) {
        unitPrice = Number(eventData.pricing[normalizedType]);
      } else if (typeof eventData?.price === "number") {
        // 2. Tentar base price * multiplier
        const multiplier = MULTIPLIERS[normalizedType] || 1;
        unitPrice = Number(eventData.price) * multiplier;
      } else {
        // 3. Fallback
        const DEFAULTS: Record<string, number> = {
          standard: 50,
          vip: 100,
          premium: 150,
        };
        unitPrice = DEFAULTS[normalizedType];
      }

      if (unitPrice === undefined || isNaN(unitPrice)) {
        res.status(400).json({
          error: `Não foi possível determinar o preço para: ${ticketType}`,
        });
        return;
      }

      // Validar estoque disponível
      const qty = Math.max(1, Math.min(10, Number(quantity) || 1));
      let availableForType: number | undefined;
      if (eventData?.inventory && typeof eventData.inventory === "object") {
        availableForType = Number(eventData.inventory?.[normalizedType] ?? 0);
      } else if (typeof eventData?.availableTickets === "number") {
        availableForType = Number(eventData.availableTickets);
      }
      if (typeof availableForType === "number" && availableForType < qty) {
        res.status(400).json({
          error: "Ingressos indisponíveis para este tipo/quantidade",
        });
        return;
      }

      // Create order (pending) and bind to external_reference
      const orderRef = await firestore.collection("orders").add({
        userId: user.uid,
        userEmail: userEmail || user.email || null,
        eventId,
        ticketType: normalizedType,
        quantity: qty,
        unitPrice,
        eventTitle: eventData?.title || null,
        status: "pending",
        provider: "mercadopago",
        createdAt: FieldValue.serverTimestamp(),
        ticketsCreated: false,
      });

      const projectId =
        process.env.GCLOUD_PROJECT ||
        (function () {
          try {
            const cfg = JSON.parse(process.env.FIREBASE_CONFIG || "{}");
            return cfg.projectId || "ingressosz";
          } catch {
            return "ingressosz";
          }
        })();
      const emulator =
        (process.env.FUNCTIONS_EMULATOR || "false").toLowerCase() === "true";
      const base = emulator
        ? `http://localhost:5001/${projectId}/us-central1`
        : `https://us-central1-${projectId}.cloudfunctions.net`;
      const webhookToken = (process.env.MP_WEBHOOK_TOKEN || "").trim();
      let notificationUrl =
        process.env.MP_WEBHOOK_URL || `${base}/mercadoPagoWebhook`;
      if (webhookToken) {
        try {
          const u = new URL(notificationUrl);
          if (!u.searchParams.has("token")) {
            u.searchParams.set("token", webhookToken);
            notificationUrl = u.toString();
          }
        } catch {}
      }

      const origin = (req.headers["origin"] as string) || DEFAULT_ORIGIN;
      const prefClient = new Preference(mpClient);
      const result = await prefClient.create({
        body: {
          items: [
            {
              id: `ticket-${normalizedType}`,
              title: `Ingresso ${normalizedType}`,
              category_id: "entertainment",
              quantity: qty,
              currency_id: "BRL",
              unit_price: unitPrice,
            },
          ],
          payer: {
            email: userEmail || user.email || undefined,
          },
          back_urls: {
            success: new URL("/pagamento/sucesso", origin).toString(),
            pending: new URL("/pagamento/sucesso", origin).toString(),
            failure: new URL("/pagamento/cancelado", origin).toString(),
          },
          auto_return: "approved",
          notification_url: notificationUrl,
          external_reference: orderRef.id,
          metadata: {
            userId: user.uid,
            eventId,
            ticketType: normalizedType,
            quantity: String(quantity),
          },
        },
      });

      // Save preference info in order document
      await orderRef.update({
        preferenceId: result.id,
        initPoint: result.init_point,
        sandboxInitPoint: (result as any).sandbox_init_point || null,
      });

      res.json({
        preferenceId: result.id,
        init_point: result.init_point,
        sandbox_init_point: (result as any).sandbox_init_point,
      });
    } catch (err: any) {
      console.error("mercadoPagoCreatePreference error:", err);
      res.status(400).json({ error: err?.message || "Unknown error" });
    }
  }
);

/**
 * Mercado Pago: Webhook handler
 * - Processes payment notifications, updates order status, and creates tickets on approval
 */
export const mercadoPagoWebhook = functions.https.onRequest(
  async (req: functions.https.Request, res: any) => {
    // Mercado Pago sends POST notifications; CORS isn't necessary, but we allow OPTIONS
    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    if (!RUNNING_ON_EMULATOR && !ENABLE_PROD_FUNCTIONS) {
      res.status(403).json({
        error: "Webhook disponível apenas em desenvolvimento (emulador)",
      });
      return;
    }

    if (!mpClient) {
      res.status(500).json({ error: "Mercado Pago não configurado" });
      return;
    }

    try {
      const expectedToken = (process.env.MP_WEBHOOK_TOKEN || "").trim();
      if (!expectedToken) {
        res.status(403).json({ error: "Token do webhook ausente" });
        return;
      }
      const token =
        (req.query?.token as string) ||
        (req.headers["x-webhook-token"] as string) ||
        "";
      if (token !== expectedToken) {
        res.status(403).json({ error: "Token do webhook inválido" });
        return;
      }

      const topic =
        (req.query.topic as string) ||
        (req.body?.type as string) ||
        (req.body?.topic as string);
      const idFromBody = req.body?.data?.id || req.body?.id;

      if (!topic || topic !== "payment" || !idFromBody) {
        console.warn("Webhook recebido sem dados esperados", {
          topic,
          idFromBody,
        });
        res.status(200).json({ received: true });
        return;
      }

      const paymentClient = new Payment(mpClient);
      const payment = await paymentClient.get({ id: String(idFromBody) });
      const payerEmail = (payment as any)?.payer?.email || null;
      const requestId = (req.headers["x-request-id"] as string) || null;

      const externalRef = (payment as any).external_reference as
        | string
        | undefined;
      const status = (payment as any).status as string | undefined;
      const amount = Number((payment as any).transaction_amount) || 0;

      if (!externalRef) {
        console.warn(
          "Pagamento sem external_reference; não é possível vincular ao pedido",
          { idFromBody }
        );
        res.status(200).json({ received: true });
        return;
      }

      const orderRef = firestore.collection("orders").doc(externalRef);
      const snap = await orderRef.get();
      if (!snap.exists) {
        console.warn("Pedido não encontrado para external_reference", {
          externalRef,
        });
        res.status(200).json({ received: true });
        return;
      }

      const order = snap.data() as any;
      if (status === "approved") {
        // Proteção contra replay: se já processado este paymentId, devolver duplicado
        try {
          const evtRef = firestore
            .collection("webhook_events")
            .doc(String(idFromBody));
          const evtSnap = await evtRef.get();
          if (evtSnap.exists && (evtSnap.data() as any)?.processed === true) {
            res.json({ received: true, duplicated: true });
            return;
          }
        } catch {}
        // Idempotência: evitar criar ingressos mais de uma vez
        if (order.status === "approved" || order.ticketsCreated === true) {
          await orderRef.update({
            status: "approved",
            paymentId: String(idFromBody),
            amount,
            ticketsCreated: true,
          });
          try {
            await firestore
              .collection("webhook_events")
              .doc(String(idFromBody))
              .set({
                processed: true,
                externalRef,
                status: "approved",
                requestId,
                createdAt: FieldValue.serverTimestamp(),
              });
          } catch {}
          res.json({ received: true, duplicated: true });
          return;
        }

        // Create tickets and update inventory atomically
        const qty = Number(order.quantity || 1);
        await firestore.runTransaction(
          async (tx: admin.firestore.Transaction) => {
            const eventRef = firestore
              .collection("events")
              .doc(String(order.eventId));
            const eventSnap = await tx.get(eventRef);
            const eventData = eventSnap.exists
              ? (eventSnap.data() as any)
              : null;

            // Update per-type inventory or total availableTickets
            if (eventData) {
              if (
                eventData.inventory &&
                typeof eventData.inventory === "object"
              ) {
                const current = Number(
                  eventData.inventory?.[order.ticketType] ?? 0
                );
                // Permitir valor negativo para rastrear overselling
                const next = current - qty;

                if (next < 0) {
                  console.warn(
                    `⚠️ Overselling detectado para evento ${order.eventId} ` +
                      `(tipo ${order.ticketType}). Estoque: ${current} -> ${next}`
                  );
                }

                tx.update(eventRef, {
                  [`inventory.${order.ticketType}`]: next,
                  availableTickets: FieldValue.increment(-qty),
                });
              } else if (typeof eventData.availableTickets === "number") {
                const current = Number(eventData.availableTickets);
                // Permitir valor negativo para rastrear overselling
                const next = current - qty;

                if (next < 0) {
                  console.warn(
                    `⚠️ Overselling detectado para evento ${order.eventId} (global). ` +
                      `Estoque: ${current} -> ${next}`
                  );
                }

                tx.update(eventRef, { availableTickets: next });
              }
            }

            for (let i = 0; i < qty; i++) {
              const ticketRef = firestore.collection("tickets").doc();
              tx.set(ticketRef, {
                userId: order.userId,
                eventId: order.eventId,
                ticketType: order.ticketType,
                quantity: 1,
                purchaseDate: FieldValue.serverTimestamp(),
                paymentId: String(idFromBody),
                provider: "mercadopago",
                status: "active",
                qrCode: `TICKET-${randomUUID()}`,
                userEmail: order.userEmail || payerEmail || null,
                price: Number(order.unitPrice) || amount,
              });
            }

            tx.update(orderRef, {
              status: "approved",
              paymentId: String(idFromBody),
              amount,
              ticketsCreated: true,
            });
          }
        );

        console.log(
          `Tickets criados via Mercado Pago para user ${order.userId}`
        );
        try {
          await firestore
            .collection("webhook_events")
            .doc(String(idFromBody))
            .set({
              processed: true,
              externalRef,
              status: "approved",
              requestId,
              createdAt: FieldValue.serverTimestamp(),
            });
        } catch {}
      } else if (status === "rejected" || status === "cancelled") {
        await orderRef.update({
          status: "rejected",
          paymentId: String(idFromBody),
          amount,
        });
        try {
          await firestore
            .collection("webhook_events")
            .doc(String(idFromBody))
            .set({
              processed: true,
              externalRef,
              status: "rejected",
              requestId,
              createdAt: FieldValue.serverTimestamp(),
            });
        } catch {}
      } else {
        await orderRef.update({
          status: status || "pending",
          paymentId: String(idFromBody),
          amount,
        });
        try {
          await firestore
            .collection("webhook_events")
            .doc(String(idFromBody))
            .set({
              processed: false,
              externalRef,
              status: status || "pending",
              requestId,
              createdAt: FieldValue.serverTimestamp(),
            });
        } catch {}
      }

      res.json({ received: true });
    } catch (err: any) {
      console.error("mercadoPagoWebhook error:", err);
      res.status(400).json({ error: err?.message || "Unknown error" });
    }
  }
);

/**
 * Validação de ingresso (backend)
 * - Verifica autenticação
 * - Localiza ingresso por ticketId ou qrCode
 * - Checa status e marca como "used" com validatedAt/validatedBy
 */
export const validateTicket = functions.https.onRequest(
  async (req: functions.https.Request, res: any) => {
    if (setCors(req, res)) return;

    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }

    try {
      // Em qualquer cenário onde Firestore/Auth não estejam emulados, evitar tocar produção
      if (
        !RUNNING_ON_EMULATOR ||
        !USING_FIRESTORE_EMULATOR ||
        !USING_AUTH_EMULATOR
      ) {
        const { qrCode } = req.body || {};
        const found = OFFLINE_TICKETS.find((t) => String(qrCode) === t.code);
        if (!found) {
          res.status(404).json({
            success: false,
            message: "Ingresso não encontrado (offline)",
            status: "not_found",
          });
          return;
        }
        if (found.status === "used") {
          res.json({
            success: false,
            message: "Este ingresso já foi utilizado (offline)",
            status: "used",
          });
          return;
        }
        res.json({
          success: true,
          message: "Ingresso validado com sucesso (offline)",
          ticketId: `offline-${Date.now()}`,
          status: "used",
          ticket: {
            eventTitle: "Evento Teste",
            ticketType: "Geral",
            holderEmail: "usuario@teste.com",
            eventDate: new Date().toISOString().slice(0, 10),
            eventTime: "20:00",
          },
        });
        return;
      }

      const user = await verifyAuth(req);
      // Rate limit por IP
      const ip = getClientIp(req);
      const allowedIp = await checkRateLimit(ip, "validateTicket:ip", 90);
      if (!allowedIp) {
        res.status(429).json({
          success: false,
          message: "Muitas requisições deste IP. Tente novamente em instantes.",
        });
        return;
      }
      // Rate limit: até 30 validações/min por usuário
      const allowed = await checkRateLimit(user.uid, "validateTicket", 30);
      if (!allowed) {
        res.status(429).json({
          success: false,
          message:
            "Muitas requisições de validação. Tente novamente em instantes.",
        });
        return;
      }
      // Restrição de acesso: apenas perfis com role 'validator' ou 'organizer'
      try {
        const userDoc = await firestore.collection("users").doc(user.uid).get();
        const profile = userDoc.exists ? (userDoc.data() as any) : null;
        const role = String(profile?.role || "user").toLowerCase();
        if (!profile || (role !== "validator" && role !== "organizer")) {
          res.status(403).json({
            success: false,
            message: "Acesso negado: perfil não autorizado para validação",
          });
          return;
        }
      } catch (e) {
        console.warn("Falha ao verificar role do usuário", e);
        res.status(403).json({ success: false, message: "Acesso negado" });
        return;
      }
      const { ticketId, qrCode } = req.body || {};

      if (!ticketId && !qrCode) {
        res
          .status(400)
          .json({ success: false, message: "Informe ticketId ou qrCode" });
        return;
      }

      // Encontrar ingresso
      let ticketSnap: admin.firestore.DocumentSnapshot<admin.firestore.DocumentData> | null =
        null;

      if (ticketId) {
        const ref = firestore.collection("tickets").doc(String(ticketId));
        ticketSnap = await ref.get();
      } else if (qrCode) {
        const q = await firestore
          .collection("tickets")
          .where("qrCode", "==", String(qrCode))
          .limit(1)
          .get();
        ticketSnap = q.empty ? null : q.docs[0];
      }

      if (!ticketSnap || !ticketSnap.exists) {
        res
          .status(404)
          .json({ success: false, message: "Ingresso não encontrado" });
        // Auditoria de tentativa falha
        try {
          await firestore.collection("validation_logs").add({
            outcome: "not_found",
            ticketId: ticketId || null,
            qrCode: qrCode || null,
            validatorId: user.uid,
            ip: getClientIp(req),
            userAgent: req.headers["user-agent"] || null,
            createdAt: FieldValue.serverTimestamp(),
          });
        } catch {}
        return;
      }

      const ticketData = ticketSnap.data() as any;

      // Idempotência: se já foi usado ou cancelado, retornar mensagem apropriada
      if (ticketData.status === "used") {
        res.json({
          success: false,
          message: "Este ingresso já foi utilizado",
          ticketId: ticketSnap.id,
          status: "used",
        });
        try {
          await firestore.collection("validation_logs").add({
            outcome: "already_used",
            ticketId: ticketSnap.id,
            qrCode: ticketData.qrCode || null,
            validatorId: user.uid,
            ip: getClientIp(req),
            userAgent: req.headers["user-agent"] || null,
            createdAt: FieldValue.serverTimestamp(),
          });
        } catch {}
        return;
      }
      if (ticketData.status === "cancelled") {
        res.json({
          success: false,
          message: "Este ingresso foi cancelado",
          ticketId: ticketSnap.id,
          status: "cancelled",
        });
        try {
          await firestore.collection("validation_logs").add({
            outcome: "cancelled",
            ticketId: ticketSnap.id,
            qrCode: ticketData.qrCode || null,
            validatorId: user.uid,
            ip: getClientIp(req),
            userAgent: req.headers["user-agent"] || null,
            createdAt: FieldValue.serverTimestamp(),
          });
        } catch {}
        return;
      }
      if (ticketData.status !== "active") {
        res.json({
          success: false,
          message: "Ingresso inválido para validação",
          ticketId: ticketSnap.id,
          status: ticketData.status || "unknown",
        });
        return;
      }

      // Se o qrCode foi informado, checar correspondência para maior segurança
      if (qrCode && ticketData.qrCode !== String(qrCode)) {
        res.status(422).json({
          success: false,
          message: "QR Code não confere",
        });
        try {
          await firestore.collection("validation_logs").add({
            outcome: "qr_mismatch",
            ticketId: ticketSnap.id,
            qrCode: qrCode || null,
            validatorId: user.uid,
            ip: getClientIp(req),
            userAgent: req.headers["user-agent"] || null,
            createdAt: FieldValue.serverTimestamp(),
          });
        } catch {}
        return;
      }

      // Marcar como usado e retornar detalhes
      const ticketDocData = ticketSnap.data() as any;
      const eventRef = firestore
        .collection("events")
        .doc(String(ticketDocData.eventId));
      const eventSnap = await eventRef.get();
      const eventData = eventSnap.exists ? (eventSnap.data() as any) : null;

      await ticketSnap.ref.update({
        status: "used",
        validatedAt: FieldValue.serverTimestamp(),
        validatedBy: user.uid,
      });

      // Auditoria de sucesso
      try {
        await firestore.collection("validation_logs").add({
          outcome: "validated",
          ticketId: ticketSnap.id,
          qrCode: ticketDocData.qrCode || null,
          validatorId: user.uid,
          eventId: ticketDocData.eventId || null,
          ip: getClientIp(req),
          userAgent: req.headers["user-agent"] || null,
          createdAt: FieldValue.serverTimestamp(),
        });
      } catch {}

      res.json({
        success: true,
        message: "Ingresso validado com sucesso",
        ticketId: ticketSnap.id,
        status: "used",
        ticket: {
          eventTitle: eventData?.title || "Evento",
          ticketType: String(ticketDocData.ticketType || "Geral"),
          holderEmail: String(ticketDocData.userEmail || ""),
          eventDate: String(eventData?.date || ""),
          eventTime: String(eventData?.time || ""),
        },
      });
    } catch (err: any) {
      console.error("validateTicket error:", err);
      res.status(400).json({
        success: false,
        message: err?.message || "Erro ao validar ingresso",
      });
    }
  }
);

/**
 * Seed de dados de teste (apenas emulador)
 * - Cria eventos e ingressos de teste com QR codes específicos
 */
export const seedTestData = functions.https.onRequest(async (req, res) => {
  if (setCors(req, res)) return;

  if (req.method !== "POST") {
    res.status(405).send("Method Not Allowed");
    return;
  }

  try {
    // Bloquear em produção por segurança
    const runningOnEmulator =
      (process.env.FUNCTIONS_EMULATOR || "false").toLowerCase() === "true";
    if (!runningOnEmulator) {
      res
        .status(403)
        .json({ success: false, message: "Seed permitido apenas no emulador" });
      return;
    }

    if (!USING_FIRESTORE_EMULATOR) {
      res
        .status(403)
        .json({ success: false, message: "Seed requer Firestore emulado" });
      return;
    }

    try {
      await verifyAuth(req);
    } catch {}

    // Criar eventos
    const events = [
      {
        title: "Show Teste IngressosZ",
        description: "Evento de teste para validação de ingressos",
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        venue: "Arena IngressosZ",
        createdAt: FieldValue.serverTimestamp(),
      },
      {
        title: "Festival Teste IngressosZ",
        description: "Segundo evento de teste",
        date: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString(),
        venue: "Praça IngressosZ",
        createdAt: FieldValue.serverTimestamp(),
      },
    ];

    const eventIds: string[] = [];
    for (const ev of events) {
      const ref = await firestore.collection("events").add(ev);
      eventIds.push(ref.id);
    }

    // Criar ingressos
    const tickets = [
      // Válidos
      {
        userId: "test-user-1",
        userEmail: "usuario1@teste.com",
        eventId: eventIds[0],
        ticketType: "VIP",
        price: 150.0,
        quantity: 1,
        status: "active",
        qrCode: "TICKET-1756219017406-fh2k739l1",
        purchaseDate: new Date().toISOString(),
        validatedAt: null,
        validatedBy: null,
      },
      {
        userId: "test-user-2",
        userEmail: "usuario2@teste.com",
        eventId: eventIds[0],
        ticketType: "Geral",
        price: 150.0,
        quantity: 1,
        status: "active",
        qrCode: "TICKET-JT1ZHCGOVQYIECOUAZCF",
        purchaseDate: new Date().toISOString(),
        validatedAt: null,
        validatedBy: null,
      },
      // Já usado
      {
        userId: "test-user-3",
        userEmail: "usuario3@teste.com",
        eventId: eventIds[1],
        ticketType: "VIP",
        price: 80.0,
        quantity: 1,
        status: "used",
        qrCode: "TICKET-1756219017407-usado123",
        purchaseDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
        validatedAt: FieldValue.serverTimestamp(),
        validatedBy: "validator-1",
      },
      // Extra válido
      {
        userId: "test-user-4",
        userEmail: "usuario4@teste.com",
        eventId: eventIds[0],
        ticketType: "Geral",
        price: 100.0,
        quantity: 1,
        status: "active",
        qrCode: "TICKET-1756295230187-lxfcondum",
        purchaseDate: new Date().toISOString(),
        validatedAt: null,
        validatedBy: null,
      },
    ];

    const created: string[] = [];
    for (const t of tickets) {
      const ref = await firestore.collection("tickets").add(t);
      created.push(ref.id);
    }

    res.json({ success: true, events: eventIds, tickets: created });
  } catch (err: any) {
    console.error("seedTestData error:", err);
    res.status(400).json({
      success: false,
      message: err?.message || "Erro ao criar dados de teste",
    });
  }
});

export const health = functions.https.onRequest(
  async (req: functions.https.Request, res: any) => {
    if (setCors(req, res)) return;
    if (req.method !== "GET") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    try {
      if (!RUNNING_ON_EMULATOR) {
        res.status(403).json({ status: "forbidden" });
        return;
      }
      res.json({
        status: "ok",
        emulator: RUNNING_ON_EMULATOR,
        firestoreEmulator: Boolean(process.env.FIRESTORE_EMULATOR_HOST),
        authEmulator: Boolean(process.env.FIREBASE_AUTH_EMULATOR_HOST),
        time: new Date().toISOString(),
      });
    } catch (e: any) {
      res
        .status(500)
        .json({ status: "error", message: e?.message || "health failed" });
    }
  }
);

export const logClientError = functions.https.onRequest(
  async (req: functions.https.Request, res: any) => {
    if (setCors(req, res)) return;
    if (req.method !== "POST") {
      res.status(405).send("Method Not Allowed");
      return;
    }
    try {
      const ip = getClientIp(req);
      const allowedIp = await checkRateLimit(ip, "logClientError:ip", 120);
      if (!allowedIp) {
        res.status(429).json({ ok: false });
        return;
      }
      let body: any = {};
      try {
        body =
          typeof req.body === "object"
            ? req.body
            : JSON.parse(req.body || "{}");
      } catch {}
      let user: any = null;
      try {
        user = await verifyAuth(req);
      } catch {}
      const payload: Record<string, any> = {
        type: String(body?.type || "client-error"),
        message: String(body?.message || ""),
        route: body?.route ? String(body.route) : null,
        ua: body?.ua ? String(body.ua) : null,
        uid: user?.uid || (body?.uid ? String(body.uid) : null),
        ts: typeof body?.ts === "number" ? body.ts : Date.now(),
      };
      const extra = { ...body };
      delete extra.type;
      delete extra.message;
      delete extra.route;
      delete extra.ua;
      delete extra.uid;
      delete extra.ts;
      await firestore.collection("client_errors").add({
        ...payload,
        extra,
        ip,
        createdAt: FieldValue.serverTimestamp(),
      });
      res.json({ ok: true });
    } catch (err: any) {
      console.error("logClientError error:", err);
      res
        .status(400)
        .json({ ok: false, error: err?.message || "Unknown error" });
    }
  }
);
