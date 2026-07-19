/* eslint-disable require-jsdoc, max-len, complexity */
import {
  FieldValue,
  Timestamp,
  getFirestore,
} from "firebase-admin/firestore";
import { createHash, randomUUID } from "node:crypto";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { callableSecurityOptions } from "../config/security.js";
import {
  MAX_PURCHASE_QUANTITY,
  resolveMaxPerPurchase,
} from "../domain/purchaseLimits.js";
import { requirePayloadObject } from "./eventAccess.js";
import { checkRateLimit } from "../utils/rateLimit.js";

export const PAYMENT_SESSION_TTL_MS = 15 * 60 * 1000;
export const PROVIDER_CREATING_LEASE_MS = 2 * 60 * 1000;
export const CREATE_PAYMENT_SESSION_RATE_LIMIT_PER_MINUTE = 10;
const TICKET_TYPES = ["standard", "vip", "premium"] as const;
const PAYMENT_METHODS = ["checkout", "pix"] as const;

export type TicketType = (typeof TICKET_TYPES)[number];
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

export interface PaymentSessionIdentity {
  uid: string;
  email: string;
}

export interface CreatePaymentSessionInput {
  eventId: string;
  ticketType: TicketType;
  quantity: number;
  paymentMethod: PaymentMethod;
}

export interface PaymentSessionData extends CreatePaymentSessionInput {
  userId: string;
  userEmail: string;
  unitPrice: number;
  totalAmount: number;
  status: string;
  provider: string;
  providerState: string;
  providerAttemptId?: string;
  providerStartedAt?: unknown;
  expiresAt: unknown;
}

export interface ProviderClaim {
  session: PaymentSessionData;
  providerAttemptId: string;
}

export type ProviderTransitionResult = "updated" | "stale";

export interface PaymentEventData {
  title?: string;
  price?: number;
  pricing?: Record<string, number>;
  availableTickets?: number;
  inventory?: Record<string, number>;
  maxPerPurchase?: number;
}

export interface PaymentSessionRepository {
  createAuthorized(
    input: CreatePaymentSessionInput,
    identity: PaymentSessionIdentity,
    expiresAtMillis: number
  ): Promise<{ paymentSessionId: string; expiresAt: unknown }>;
  claimProvider(
    paymentSessionId: string,
    uid: string,
    paymentMethod: PaymentMethod,
    nowMillis: number
  ): Promise<ProviderClaim>;
  getEvent(eventId: string): Promise<PaymentEventData | null>;
  markProviderCreated(
    paymentSessionId: string,
    providerAttemptId: string,
    providerIdField: "preferenceId" | "paymentId",
    providerId: string
  ): Promise<ProviderTransitionResult>;
  markProviderFailed(
    paymentSessionId: string,
    providerAttemptId: string
  ): Promise<ProviderTransitionResult>;
}

interface CallableRequest {
  auth?: { uid: string; token: Record<string, unknown> };
  data?: unknown;
}

export interface ProviderPaymentDependencies<T> {
  repository: PaymentSessionRepository;
  now(): number;
  checkRateLimit(uid: string): Promise<boolean>;
  createProviderPayment(
    session: PaymentSessionData,
    event: PaymentEventData,
    paymentSessionId: string
  ): Promise<{ providerId: string; response: T }>;
}

function requireIdentity(request: CallableRequest): PaymentSessionIdentity {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticacao obrigatoria.");
  }
  const email = request.auth.token.email;
  if (typeof email !== "string" || !email.trim()) {
    throw new HttpsError(
      "failed-precondition",
      "O usuario autenticado precisa possuir email."
    );
  }
  return { uid: request.auth.uid, email: email.trim().toLowerCase() };
}

function rejectUnknownFields(
  payload: Record<string, unknown>,
  allowed: string[]
) {
  const unknown = Object.keys(payload).filter((key) => !allowed.includes(key));
  if (unknown.length) {
    throw new HttpsError(
      "invalid-argument",
      `Campos nao permitidos: ${unknown.join(", ")}.`
    );
  }
}

export function validateCreatePaymentSessionPayload(
  data: unknown
): CreatePaymentSessionInput {
  const payload = requirePayloadObject(data);
  rejectUnknownFields(payload, [
    "eventId",
    "ticketType",
    "quantity",
    "paymentMethod",
  ]);
  if (typeof payload.eventId !== "string" || !payload.eventId.trim()) {
    throw new HttpsError("invalid-argument", "eventId e obrigatorio.");
  }
  if (!TICKET_TYPES.includes(payload.ticketType as TicketType)) {
    throw new HttpsError("invalid-argument", "ticketType invalido.");
  }
  if (!PAYMENT_METHODS.includes(payload.paymentMethod as PaymentMethod)) {
    throw new HttpsError("invalid-argument", "paymentMethod invalido.");
  }
  if (
    typeof payload.quantity !== "number" ||
    !Number.isSafeInteger(payload.quantity) ||
    payload.quantity <= 0 ||
    payload.quantity > MAX_PURCHASE_QUANTITY
  ) {
    throw new HttpsError(
      "invalid-argument",
      `quantity deve ser um inteiro entre 1 e ${MAX_PURCHASE_QUANTITY}.`
    );
  }
  return {
    eventId: payload.eventId.trim(),
    ticketType: payload.ticketType as TicketType,
    quantity: payload.quantity,
    paymentMethod: payload.paymentMethod as PaymentMethod,
  };
}

export function buildPaymentSession(
  input: CreatePaymentSessionInput,
  identity: PaymentSessionIdentity,
  event: PaymentEventData,
  expiresAt: unknown,
  timestamp: unknown
) {
  const maxAllowed = resolveMaxPerPurchase(event);
  if (input.quantity > maxAllowed) {
    throw new HttpsError(
      "invalid-argument",
      `Maximo de ${maxAllowed} ingressos por compra.`
    );
  }
  const globalStock = event.availableTickets ?? 0;
  const typeStock = event.inventory?.[input.ticketType] ?? globalStock;
  if (globalStock < input.quantity || typeStock < input.quantity) {
    throw new HttpsError(
      "failed-precondition",
      "Ingressos esgotados ou quantidade indisponivel."
    );
  }
  const rawPrice = event.pricing?.[input.ticketType] ?? event.price;
  if (
    typeof rawPrice !== "number" ||
    !Number.isFinite(rawPrice) ||
    rawPrice < 0
  ) {
    throw new HttpsError(
      "failed-precondition",
      "Preco do evento invalido."
    );
  }
  return {
    ...input,
    userId: identity.uid,
    userEmail: identity.email,
    unitPrice: rawPrice,
    totalAmount: rawPrice * input.quantity,
    status: "pending",
    provider: "mercadopago",
    providerState: "ready",
    expiresAt,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
}

function toMillis(value: unknown): number {
  if (value instanceof Date) return value.getTime();
  if (
    value &&
    typeof value === "object" &&
    "toMillis" in value &&
    typeof (value as { toMillis?: unknown }).toMillis === "function"
  ) {
    return (value as { toMillis(): number }).toMillis();
  }
  return Number.NaN;
}

export function buildProviderIdempotencyKey(
  paymentSessionId: string,
  paymentMethod: PaymentMethod
) {
  return createHash("sha256")
    .update(`ingressosz:${paymentMethod}:${paymentSessionId}`)
    .digest("hex");
}

export function validateProviderSession(
  session: Partial<PaymentSessionData>,
  uid: string,
  paymentMethod: PaymentMethod,
  nowMillis: number
): PaymentSessionData {
  if (session.userId !== uid) {
    throw new HttpsError("permission-denied", "Sessao pertence a outro usuario.");
  }
  if (session.status !== "pending") {
    throw new HttpsError("failed-precondition", "Sessao nao esta pendente.");
  }
  if (session.provider !== "mercadopago") {
    throw new HttpsError("failed-precondition", "Provider da sessao invalido.");
  }
  if (session.paymentMethod !== paymentMethod) {
    throw new HttpsError(
      "failed-precondition",
      "Metodo de pagamento da sessao invalido."
    );
  }
  const expiresAtMillis = toMillis(session.expiresAt);
  if (!Number.isFinite(expiresAtMillis) || expiresAtMillis <= nowMillis) {
    throw new HttpsError("failed-precondition", "Sessao de pagamento expirada.");
  }
  if (session.providerState === "created") {
    throw new HttpsError("already-exists", "Pagamento da sessao ja foi iniciado.");
  }
  if (session.providerState === "creating") {
    const providerStartedAtMillis = toMillis(session.providerStartedAt);
    const leaseCutoff = nowMillis - PROVIDER_CREATING_LEASE_MS;
    if (
      Number.isFinite(providerStartedAtMillis) &&
      providerStartedAtMillis > leaseCutoff
    ) {
      throw new HttpsError(
        "already-exists",
        "Pagamento da sessao ja esta sendo iniciado."
      );
    }
    return session as PaymentSessionData;
  }
  if (session.providerState !== "ready" && session.providerState !== "failed") {
    throw new HttpsError("failed-precondition", "Estado do provider invalido.");
  }
  return session as PaymentSessionData;
}

export function validatePersistedSessionData(session: PaymentSessionData) {
  if (
    typeof session.eventId !== "string" ||
    !TICKET_TYPES.includes(session.ticketType) ||
    !Number.isSafeInteger(session.quantity) ||
    session.quantity <= 0 ||
    typeof session.userEmail !== "string" ||
    typeof session.unitPrice !== "number" ||
    !Number.isFinite(session.unitPrice) ||
    session.unitPrice < 0 ||
    session.totalAmount !== session.unitPrice * session.quantity
  ) {
    throw new HttpsError("failed-precondition", "Dados persistidos da sessao invalidos.");
  }
}

export function validateCurrentEventStock(
  session: PaymentSessionData,
  event: PaymentEventData
) {
  const globalStock = event.availableTickets ?? 0;
  const typeStock = event.inventory?.[session.ticketType] ?? globalStock;
  if (globalStock < session.quantity || typeStock < session.quantity) {
    throw new HttpsError(
      "failed-precondition",
      "Ingressos esgotados ou quantidade indisponivel."
    );
  }
}

export async function executeCreatePaymentSession(
  request: CallableRequest,
  repository: PaymentSessionRepository,
  nowMillis: number,
  allowRequest: (uid: string) => Promise<boolean> = async () => true
) {
  const identity = requireIdentity(request);
  const input = validateCreatePaymentSessionPayload(request.data);
  if (!(await allowRequest(identity.uid))) {
    throw new HttpsError(
      "resource-exhausted",
      "Muitas sessoes criadas. Aguarde um momento e tente novamente."
    );
  }
  return repository.createAuthorized(
    input,
    identity,
    nowMillis + PAYMENT_SESSION_TTL_MS
  );
}

export async function executeProviderPayment<T>(
  request: CallableRequest,
  paymentMethod: PaymentMethod,
  providerIdField: "preferenceId" | "paymentId",
  dependencies: ProviderPaymentDependencies<T>
): Promise<T> {
  const identity = requireIdentity(request);
  const payload = requirePayloadObject(request.data);
  rejectUnknownFields(payload, ["paymentSessionId"]);
  if (
    typeof payload.paymentSessionId !== "string" ||
    !payload.paymentSessionId.trim()
  ) {
    throw new HttpsError(
      "invalid-argument",
      "paymentSessionId e obrigatorio."
    );
  }
  const allowed = await dependencies.checkRateLimit(identity.uid);
  if (!allowed) {
    throw new HttpsError(
      "resource-exhausted",
      "Muitas tentativas. Aguarde um momento e tente novamente."
    );
  }
  const paymentSessionId = payload.paymentSessionId.trim();
  let claimed = false;
  let providerCompleted = false;
  let providerAttemptId: string | undefined;
  try {
    const claim = await dependencies.repository.claimProvider(
      paymentSessionId,
      identity.uid,
      paymentMethod,
      dependencies.now()
    );
    const session = claim.session;
    providerAttemptId = claim.providerAttemptId;
    claimed = true;
    validatePersistedSessionData(session);
    const event = await dependencies.repository.getEvent(session.eventId);
    if (!event) throw new HttpsError("not-found", "Evento nao encontrado.");
    validateCurrentEventStock(session, event);
    const result = await dependencies.createProviderPayment(
      session,
      event,
      paymentSessionId
    );
    providerCompleted = true;
    await dependencies.repository.markProviderCreated(
      paymentSessionId,
      providerAttemptId,
      providerIdField,
      result.providerId
    );
    return result.response;
  } catch (error) {
    if (claimed && providerAttemptId && !providerCompleted) {
      try {
        await dependencies.repository.markProviderFailed(
          paymentSessionId,
          providerAttemptId
        );
      } catch {
        // Preserve the original provider or validation failure.
      }
    }
    throw error;
  }
}

export const paymentSessionRepository: PaymentSessionRepository = {
  async createAuthorized(input, identity, expiresAtMillis) {
    const db = getFirestore();
    const eventRef = db.collection("events").doc(input.eventId);
    const sessionRef = db.collection("paymentSessions").doc();
    const expiresAt = Timestamp.fromMillis(expiresAtMillis);
    await db.runTransaction(async (transaction) => {
      const event = await transaction.get(eventRef);
      if (!event.exists) {
        throw new HttpsError("not-found", "Evento nao encontrado.");
      }
      const timestamp = FieldValue.serverTimestamp();
      const session = buildPaymentSession(
        input,
        identity,
        event.data() as PaymentEventData,
        expiresAt,
        timestamp
      );
      transaction.create(sessionRef, session);
    });
    return { paymentSessionId: sessionRef.id, expiresAt };
  },

  async claimProvider(paymentSessionId, uid, paymentMethod, nowMillis) {
    const db = getFirestore();
    const sessionRef = db.collection("paymentSessions").doc(paymentSessionId);
    const providerAttemptId = randomUUID();
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(sessionRef);
      if (!snapshot.exists) {
        throw new HttpsError("not-found", "Sessao de pagamento nao encontrada.");
      }
      const session = validateProviderSession(
        snapshot.data() as Partial<PaymentSessionData>,
        uid,
        paymentMethod,
        nowMillis
      );
      transaction.update(sessionRef, {
        providerState: "creating",
        providerAttemptId,
        providerStartedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return { session, providerAttemptId };
    });
  },

  async getEvent(eventId) {
    const event = await getFirestore().collection("events").doc(eventId).get();
    return event.exists ? (event.data() as PaymentEventData) : null;
  },

  async markProviderCreated(
    paymentSessionId,
    providerAttemptId,
    providerIdField,
    providerId
  ) {
    const db = getFirestore();
    const sessionRef = db.collection("paymentSessions").doc(paymentSessionId);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(sessionRef);
      if (!snapshot.exists) {
        throw new HttpsError("not-found", "Sessao de pagamento nao encontrada.");
      }
      const data = snapshot.data();
      if (
        data?.providerState !== "creating" ||
        data?.providerAttemptId !== providerAttemptId
      ) {
        return "stale";
      }
      transaction.update(sessionRef, {
        providerState: "created",
        [providerIdField]: providerId,
        providerCreatedAt: FieldValue.serverTimestamp(),
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "updated";
    });
  },

  async markProviderFailed(paymentSessionId, providerAttemptId) {
    const db = getFirestore();
    const sessionRef = db.collection("paymentSessions").doc(paymentSessionId);
    return db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(sessionRef);
      if (!snapshot.exists) {
        throw new HttpsError("not-found", "Sessao de pagamento nao encontrada.");
      }
      const data = snapshot.data();
      if (
        data?.providerState !== "creating" ||
        data?.providerAttemptId !== providerAttemptId
      ) {
        return "stale";
      }
      transaction.update(sessionRef, {
        providerState: "failed",
        updatedAt: FieldValue.serverTimestamp(),
      });
      return "updated";
    });
  },
};

export const createPaymentSession = onCall(
  callableSecurityOptions,
  (request) => executeCreatePaymentSession(
    request,
    paymentSessionRepository,
    Date.now(),
    (uid) => checkRateLimit(
      `payment-session:${uid}`,
      CREATE_PAYMENT_SESSION_RATE_LIMIT_PER_MINUTE
    )
  )
);
