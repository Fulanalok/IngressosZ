/* eslint-disable require-jsdoc, max-len */
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  authorizeIdentity,
  type AuthorizationReader,
} from "../auth/authorization.js";
import { callableSecurityOptions } from "../config/security.js";
import { requirePayloadObject } from "./eventAccess.js";

interface EventRequest {
  auth?: { uid: string; token: Record<string, unknown> };
  data?: unknown;
}

export interface EventOperationsRepository {
  create(data: Record<string, unknown>): Promise<string>;
  updateAuthorized(
    eventId: string,
    uid: string,
    isAdmin: boolean,
    changes: Record<string, unknown>
  ): Promise<void>;
  deleteAuthorized(
    eventId: string,
    uid: string,
    isAdmin: boolean
  ): Promise<void>;
}

export interface EventOperationsDependencies {
  repository: EventOperationsRepository;
  timestamp(): unknown;
  authorizationReader?: AuthorizationReader;
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

async function requireEventManager(
  request: EventRequest,
  reader?: AuthorizationReader
) {
  const identity = await authorizeIdentity(
    request.auth,
    ["admin", "organizer"],
    reader
  );
  return { identity, isAdmin: identity.role === "admin" };
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

function requireSafeNonNegativeInteger(value: unknown, field: string) {
  if (
    typeof value !== "number" ||
    !Number.isSafeInteger(value) ||
    value < 0
  ) {
    throw new HttpsError(
      "invalid-argument",
      `${field} deve ser um inteiro seguro nao negativo.`
    );
  }
  return value;
}

function normalizeInventory(value: unknown) {
  if (value === undefined) return undefined;
  const map = requirePayloadObject(value);
  rejectUnknownFields(map, new Set(TICKET_TYPES));
  const inventory = Object.fromEntries(
    TICKET_TYPES.map((type) => [
      type,
      requireSafeNonNegativeInteger(map[type] ?? 0, `inventory.${type}`),
    ])
  );
  return Object.values(inventory).some((value) => value > 0) ?
    inventory :
    undefined;
}

function normalizePricing(value: unknown) {
  if (value === undefined) return undefined;
  const map = requirePayloadObject(value);
  rejectUnknownFields(map, new Set(TICKET_TYPES));
  return Object.fromEntries(
    TICKET_TYPES.map((type) => [
      type,
      requireNonNegativeNumber(map[type] ?? 0, `pricing.${type}`),
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
  const maxTickets = requireSafeNonNegativeInteger(
    payload.maxTickets,
    "maxTickets"
  );
  if (
    payload.maxPerPurchase !== undefined &&
    (typeof payload.maxPerPurchase !== "number" ||
      !Number.isSafeInteger(payload.maxPerPurchase) ||
      payload.maxPerPurchase <= 0)
  ) {
    throw new HttpsError("invalid-argument", "maxPerPurchase deve ser inteiro positivo.");
  }
  if (
    typeof payload.maxPerPurchase === "number" &&
    payload.maxPerPurchase > maxTickets
  ) {
    throw new HttpsError(
      "invalid-argument",
      "maxPerPurchase nao pode exceder maxTickets."
    );
  }
  const inventory = normalizeInventory(payload.inventory);
  const pricing = normalizePricing(payload.pricing);
  if (
    inventory &&
    Object.values(inventory).reduce((sum, value) => sum + value, 0) !==
      maxTickets
  ) {
    throw new HttpsError(
      "invalid-argument",
      "A soma de inventory deve ser igual a maxTickets."
    );
  }
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

// eslint-disable-next-line complexity
export async function executeCreateEvent(
  request: EventRequest,
  dependencies: EventOperationsDependencies
) {
  const { identity, isAdmin } = await requireEventManager(
    request,
    dependencies.authorizationReader
  );
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
  const timestamp = dependencies.timestamp();
  const data = {
    ...payload,
    organizerId: (payload.organizerId as string | undefined) ?? identity.uid,
    createdBy: identity.uid,
    availableTickets: payload.maxTickets,
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
  const { identity, isAdmin } = await requireEventManager(
    request,
    dependencies.authorizationReader
  );
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
    if (
      field !== "image" &&
      REQUIRED_STRINGS.includes(field) &&
      !value.trim()
    ) {
      throw new HttpsError(
        "invalid-argument",
        `${field} nao pode ser vazio.`
      );
    }
  }
  await dependencies.repository.updateAuthorized(eventId, identity.uid, isAdmin, {
    ...changes,
    updatedAt: dependencies.timestamp(),
  });
  return { success: true };
}

export async function executeDeleteEvent(
  request: EventRequest,
  dependencies: EventOperationsDependencies
) {
  const { identity, isAdmin } = await requireEventManager(
    request,
    dependencies.authorizationReader
  );
  const payload = requirePayloadObject(request.data);
  rejectUnknownFields(payload, new Set(["eventId"]));
  if (typeof payload.eventId !== "string" || !payload.eventId) {
    throw new HttpsError("invalid-argument", "eventId e obrigatorio.");
  }
  await dependencies.repository.deleteAuthorized(
    payload.eventId,
    identity.uid,
    isAdmin
  );
  return { success: true };
}

const firestoreRepository: EventOperationsRepository = {
  async create(data) {
    return (await getFirestore().collection("events").add(data)).id;
  },
  async updateAuthorized(eventId, uid, isAdmin, changes) {
    const db = getFirestore();
    const eventRef = db.collection("events").doc(eventId);
    await db.runTransaction(async (transaction) => {
      const event = await transaction.get(eventRef);
      if (!event.exists) {
        throw new HttpsError("not-found", "Evento nao encontrado.");
      }
      if (!isAdmin && event.data()?.organizerId !== uid) {
        throw new HttpsError(
          "permission-denied",
          "O evento pertence a outro organizador."
        );
      }
      transaction.update(eventRef, changes);
    });
  },
  async deleteAuthorized(eventId, uid, isAdmin) {
    const db = getFirestore();
    const eventRef = db.collection("events").doc(eventId);
    await db.runTransaction(async (transaction) => {
      const event = await transaction.get(eventRef);
      if (!event.exists) {
        throw new HttpsError("not-found", "Evento nao encontrado.");
      }
      if (!isAdmin && event.data()?.organizerId !== uid) {
        throw new HttpsError(
          "permission-denied",
          "O evento pertence a outro organizador."
        );
      }
      transaction.delete(eventRef);
    });
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
