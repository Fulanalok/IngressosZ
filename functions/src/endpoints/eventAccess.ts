import admin from "firebase-admin";
import { FieldValue, getFirestore } from "firebase-admin/firestore";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { claimRole, isAdminClaims } from "../auth/authorization.js";
import { callableSecurityOptions } from "../config/security.js";

/**
 * Rejects requests that do not carry trusted admin custom claims.
 * @param {object} request Callable request.
 */
function requireAdmin(request: { auth?: { token: Record<string, unknown> } }) {
  if (!request.auth || !isAdminClaims(request.auth.token)) {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem gerenciar acessos de eventos."
    );
  }
}

/**
 * Ensures the target user has the expected trusted custom claim.
 * @param {string} userId Target user.
 * @param {string} expectedRole Required role.
 */
async function requireTargetRole(userId: string, expectedRole: string) {
  const user = await admin.auth().getUser(userId);
  if (claimRole(user.customClaims ?? {}) !== expectedRole) {
    throw new HttpsError(
      "failed-precondition",
      `O usuário precisa possuir a role ${expectedRole}.`
    );
  }
}

export const setEventOrganizer = onCall(
  callableSecurityOptions,
  async (request) => {
    requireAdmin(request);
    const { eventId, organizerId } = request.data as {
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
    requireAdmin(request);
    const { eventId, userId, active = true } = request.data as {
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
    await requireTargetRole(userId, "validator");

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
