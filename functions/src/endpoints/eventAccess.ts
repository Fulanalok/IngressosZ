import admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  authorizeIdentity,
  requireCurrentAdmin,
  type AuthorizationReader,
  type UserRole,
} from "../auth/authorization.js";
import { callableSecurityOptions } from "../config/security.js";

/**
 * Rejects requests that do not carry trusted admin custom claims.
 * @param {object} request Callable request.
 */
/**
 * Ensures the target user has current authoritative authorization.
 * @param {string} userId Target user.
 * @param {string} expectedRole Required role.
 */
async function requireTargetRole(userId: string, expectedRole: UserRole) {
  await authorizeIdentity(
    {
      uid: userId,
      token: (await admin.auth().getUser(userId)).customClaims ?? {},
    },
    [expectedRole]
  );
}

interface EventValidatorRequest {
  auth?: { uid: string; token: Record<string, unknown> };
  data?: unknown;
}

type TargetRoleChecker = (
  userId: string,
  expectedRole: UserRole
) => Promise<void>;

/**
 * Requires a callable payload to be a plain object-like record.
 * @param {unknown} data Callable payload.
 * @return {Record<string, unknown>} Valid payload.
 */
export function requirePayloadObject(data: unknown): Record<string, unknown> {
  if (data === null || typeof data !== "object" || Array.isArray(data)) {
    throw new HttpsError("invalid-argument", "Payload inválido.");
  }
  return data as Record<string, unknown>;
}

/**
 * Validates and authorizes one validator assignment change.
 * @param {EventValidatorRequest} request Callable request.
 * @param {TargetRoleChecker} targetRoleChecker Target role verifier.
 * @param {AuthorizationReader} authorizationReader Authorization source.
 * @return {Promise<object>} Normalized assignment arguments.
 */
export async function authorizeEventValidatorChange(
  request: EventValidatorRequest,
  targetRoleChecker: TargetRoleChecker = requireTargetRole,
  authorizationReader?: AuthorizationReader
) {
  await requireCurrentAdmin(request.auth, authorizationReader);
  const { eventId, userId, active = true } = requirePayloadObject(
    request.data
  ) as {
    eventId?: string;
    userId?: string;
    active?: boolean;
  };
  if (!eventId || !userId || typeof active !== "boolean") {
    throw new HttpsError(
      "invalid-argument",
      "eventId, userId e active válidos são obrigatórios."
    );
  }
  if (active) await targetRoleChecker(userId, "validator");

  return { eventId, userId, active };
}

export const setEventOrganizer = onCall(
  callableSecurityOptions,
  async (request) => {
    await requireCurrentAdmin(request.auth);
    const { eventId, organizerId } = requirePayloadObject(request.data) as {
      eventId?: string;
      organizerId?: string | null;
    };
    if (!eventId || organizerId === undefined) {
      throw new HttpsError(
        "invalid-argument",
        "eventId e organizerId são obrigatórios."
      );
    }
    if (organizerId) await requireTargetRole(organizerId, "organizer");

    const eventRef = getFirestore().collection("events").doc(eventId);
    const event = await eventRef.get();
    if (!event.exists) {
      throw new HttpsError("not-found", "Evento não encontrado.");
    }
    await eventRef.update({
      organizerId: organizerId ?? "",
      updatedAt: FieldValue.serverTimestamp(),
    });
    return { success: true };
  }
);

export const setEventValidator = onCall(
  callableSecurityOptions,
  async (request) => {
    const { eventId, userId, active } =
      await authorizeEventValidatorChange(request);

    const eventRef = getFirestore().collection("events").doc(eventId);
    const event = await eventRef.get();
    if (!event.exists) {
      throw new HttpsError("not-found", "Evento não encontrado.");
    }
    await eventRef.collection("validators").doc(userId).set({
      userId,
      assignedAt: FieldValue.serverTimestamp(),
      assignedBy: request.auth!.uid,
      active,
    });
    return { success: true };
  }
);
