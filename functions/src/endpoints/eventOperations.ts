/* eslint-disable require-jsdoc, max-len */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { claimRole, isAdminClaims } from "../auth/authorization.js";
import { callableSecurityOptions } from "../config/security.js";
import { requirePayloadObject } from "./eventAccess.js";

interface EventRequest {
  auth?: { uid: string; token: Record<string, unknown> };
  data?: unknown;
}

export interface EventOperationsRepository {
  create(data: Record<string, unknown>): Promise<string>;
  get(eventId: string): Promise<Record<string, unknown> | null>;
  update(eventId: string, data: Record<string, unknown>): Promise<void>;
  delete(eventId: string): Promise<void>;
}

export interface EventOperationsDependencies {
  repository: EventOperationsRepository;
  timestamp(): unknown;
}

const CREATE_FIELDS = new Set([
  "title", "description", "date", "time", "location", "address", "image",
  "category", "price", "maxTickets", "maxPerPurchase", "inventory", "pricing",
  "organizerId",
]);
const UPDATE_FIELDS = new Set([
  "title", "description", "date", "time", "location", "address", "image",
  "category",
]);
const REQUIRED_STRINGS = [
  "title", "description", "date", "time", "location", "address", "category",
];
const TICKET_TYPES = ["standard", "vip", "premium"];

function requireEventManager(request: EventRequest) {
  if (!request.auth) {
    throw new HttpsError("unauthenticated", "Autenticacao obrigatoria.");
  }
  const role = claimRole(request.auth.token);
  if (!isAdminClaims(request.auth.token) && role !== "organizer") {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores e organizadores podem gerenciar eventos."
    );
  }
  return { identity: request.auth, isAdmin: isAdminClaims(request.auth.token) };
}

function rejectUnknownFields(
  payload: Record<string, unknown>,
  allowed: Set<string>
) {
  const invalid = Object.keys(payload).filter((key) => !allowed.has(key));
  if (invalid.length) {
    throw new HttpsError(
      "invalid-argument",
      `Campos nao permitidos: ${invalid.join(", ")}.`
    );
  }
}

function requireNonNegativeNumber(value: unknown, field: string) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < 0) {
    throw new HttpsError("invalid-argument", `${field} deve ser um numero nao negativo.`);
  }
  return value;
}

function normalizeTicketMap(value: unknown, field: string) {
  if (value === undefined) return undefined;
  const map = requirePayloadObject(value);
  rejectUnknownFields(map, new Set(TICKET_TYPES));
  return Object.fromEntries(
    TICKET_TYPES.map((type) => [
      type,
      requireNonNegativeNumber(map[type] ?? 0, `${field}.${type}`),
    ])
  );
}

// eslint-disable-next-line complexity
function validateCreatePayload(payload: Record<string, unknown>) {
  rejectUnknownFields(payload, CREATE_FIELDS);
  for (const field of REQUIRED_STRINGS) {
    if (typeof payload[field] !== "string" || !payload[field]) {
      throw new HttpsError("invalid-argument", `${field} e obrigatorio.`);
    }
  }
  const price = requireNonNegativeNumber(payload.price, "price");
  const maxTickets = requireNonNegativeNumber(payload.maxTickets, "maxTickets");
  if (!Number.isInteger(maxTickets)) {
    throw new HttpsError("invalid-argument", "maxTickets deve ser inteiro.");
  }
  if (
    payload.maxPerPurchase !== undefined &&
    (typeof payload.maxPerPurchase !== "number" ||
      !Number.isInteger(payload.maxPerPurchase) ||
      payload.maxPerPurchase <= 0)
  ) {
    throw new HttpsError("invalid-argument", "maxPerPurchase deve ser inteiro positivo.");
  }
  const inventory = normalizeTicketMap(payload.inventory, "inventory");
  const pricing = normalizeTicketMap(payload.pricing, "pricing");
  if (payload.image !== undefined && typeof payload.image !== "string") {
    throw new HttpsError("invalid-argument", "image deve ser uma string.");
  }
  return { ...payload, price, maxTickets, inventory, pricing } as Record<
    string,
    unknown
  > & {
    price: number;
    maxTickets: number;
    inventory?: Record<string, number>;
    pricing?: Record<string, number>;
    organizerId?: unknown;
  };
}

async function requireOwnedEvent(
  eventId: string,
  uid: string,
  isAdmin: boolean,
  repository: EventOperationsRepository
) {
  const event = await repository.get(eventId);
  if (!event) throw new HttpsError("not-found", "Evento nao encontrado.");
  if (!isAdmin && event.organizerId !== uid) {
    throw new HttpsError("permission-denied", "O evento pertence a outro organizador.");
  }
  return event;
}

// eslint-disable-next-line complexity
export async function executeCreateEvent(
  request: EventRequest,
  dependencies: EventOperationsDependencies
) {
  const { identity, isAdmin } = requireEventManager(request);
  const payload = validateCreatePayload(requirePayloadObject(request.data));
  if (!isAdmin && payload.organizerId !== undefined) {
    throw new HttpsError("permission-denied", "Organizadores nao podem definir organizerId.");
  }
  if (
    payload.organizerId !== undefined &&
    (typeof payload.organizerId !== "string" || !payload.organizerId)
  ) {
    throw new HttpsError("invalid-argument", "organizerId invalido.");
  }
  const inventoryTotal = payload.inventory ?
    Object.values(payload.inventory).reduce((sum, value) => sum + value, 0) :
    0;
  const timestamp = dependencies.timestamp();
  const availableTickets = inventoryTotal > 0 ? inventoryTotal : payload.maxTickets;
  const maxTickets = inventoryTotal > 0 ? inventoryTotal : payload.maxTickets;
  const data = {
    ...payload,
    organizerId: (payload.organizerId as string | undefined) ?? identity.uid,
    createdBy: identity.uid,
    maxTickets,
    availableTickets,
    createdAt: timestamp,
    updatedAt: timestamp,
  };
  if (data.inventory === undefined) delete data.inventory;
  if (data.pricing === undefined) delete data.pricing;
  const eventId = await dependencies.repository.create(data);
  return { eventId };
}

export async function executeUpdateEvent(
  request: EventRequest,
  dependencies: EventOperationsDependencies
) {
  const { identity, isAdmin } = requireEventManager(request);
  const payload = requirePayloadObject(request.data);
  rejectUnknownFields(payload, new Set(["eventId", "changes"]));
  const eventId = payload.eventId;
  if (typeof eventId !== "string" || !eventId) {
    throw new HttpsError("invalid-argument", "eventId e obrigatorio.");
  }
  const changes = requirePayloadObject(payload.changes);
  rejectUnknownFields(changes, UPDATE_FIELDS);
  for (const [field, value] of Object.entries(changes)) {
    if (typeof value !== "string") {
      throw new HttpsError(
        "invalid-argument",
        `${field} deve ser uma string.`
      );
    }
  }
  await requireOwnedEvent(eventId, identity.uid, isAdmin, dependencies.repository);
  if (!Object.keys(changes).length) return { success: true };
  await dependencies.repository.update(eventId, {
    ...changes,
    updatedAt: dependencies.timestamp(),
  });
  return { success: true };
}

export async function executeDeleteEvent(
  request: EventRequest,
  dependencies: EventOperationsDependencies
) {
  const { identity, isAdmin } = requireEventManager(request);
  const payload = requirePayloadObject(request.data);
  rejectUnknownFields(payload, new Set(["eventId"]));
  if (typeof payload.eventId !== "string" || !payload.eventId) {
    throw new HttpsError("invalid-argument", "eventId e obrigatorio.");
  }
  await requireOwnedEvent(
    payload.eventId,
    identity.uid,
    isAdmin,
    dependencies.repository
  );
  await dependencies.repository.delete(payload.eventId);
  return { success: true };
}

const firestoreRepository: EventOperationsRepository = {
  async create(data) {
    return (await getFirestore().collection("events").add(data)).id;
  },
  async get(eventId) {
    const snapshot = await getFirestore().collection("events").doc(eventId).get();
    return snapshot.exists ? (snapshot.data() ?? {}) : null;
  },
  async update(eventId, data) {
    await getFirestore().collection("events").doc(eventId).update(data);
  },
  async delete(eventId) {
    await getFirestore().collection("events").doc(eventId).delete();
  },
};

const productionDependencies: EventOperationsDependencies = {
  repository: firestoreRepository,
  timestamp: () => FieldValue.serverTimestamp(),
};

export const createEvent = onCall(callableSecurityOptions, (request) =>
  executeCreateEvent(request, productionDependencies)
);
export const updateEvent = onCall(callableSecurityOptions, (request) =>
  executeUpdateEvent(request, productionDependencies)
);
export const deleteEvent = onCall(callableSecurityOptions, (request) =>
  executeDeleteEvent(request, productionDependencies)
);
