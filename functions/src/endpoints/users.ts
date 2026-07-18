import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { isAdminClaims } from "../auth/authorization.js";
import { callableSecurityOptions } from "../config/security.js";
import { checkRateLimit } from "../utils/rateLimit.js";

type AssignableRole = "user" | "organizer" | "validator" | "admin";

/**
 * Assigns a role in Auth claims and mirrors it for profile display.
 * @param {string} uid Target user.
 * @param {AssignableRole} role New role.
 */
async function assignRole(uid: string, role: AssignableRole) {
  const user = await admin.auth().getUser(uid);
  await admin.auth().setCustomUserClaims(uid, {
    ...(user.customClaims ?? {}),
    role,
    admin: role === "admin",
  });
  await admin.auth().revokeRefreshTokens(uid);
  await getFirestore().collection("users").doc(uid).set(
    { role },
    { merge: true }
  );
}

/**
 * Rejects requests that do not carry trusted admin custom claims.
 * @param {object} request Callable request.
 */
function requireAdmin(request: { auth?: { token: Record<string, unknown> } }) {
  if (!request.auth || !isAdminClaims(request.auth.token)) {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem realizar esta operação."
    );
  }
}

export const setAdminRole = onCall(callableSecurityOptions, async (request) => {
  requireAdmin(request);
  const requesterUid = request.auth!.uid;
  const allowed = await checkRateLimit(`role-admin:${requesterUid}`, 10);
  if (!allowed) {
    throw new HttpsError(
      "resource-exhausted",
      "Muitas tentativas. Aguarde um momento e tente novamente."
    );
  }

  const { uid } = request.data as { uid?: string };
  if (!uid) {
    throw new HttpsError("invalid-argument", "O UID do usuário é obrigatório.");
  }

  try {
    await assignRole(uid, "admin");
    return { success: true, message: `Usuário ${uid} agora é administrador.` };
  } catch (error) {
    logger.error("Erro ao definir admin:", error);
    throw new HttpsError("internal", "Erro ao definir privilégios de admin.");
  }
});

export const setUserRole = onCall(callableSecurityOptions, async (request) => {
  requireAdmin(request);
  const requesterUid = request.auth!.uid;
  const allowed = await checkRateLimit(`role-user:${requesterUid}`, 20);
  if (!allowed) {
    throw new HttpsError(
      "resource-exhausted",
      "Muitas tentativas. Aguarde um momento e tente novamente."
    );
  }

  const { uid, role } = request.data as {
    uid?: string;
    role?: AssignableRole;
  };
  const validRoles: AssignableRole[] = [
    "user",
    "organizer",
    "validator",
    "admin",
  ];
  if (!uid || !role || !validRoles.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "UID e role válidos são obrigatórios."
    );
  }

  try {
    await assignRole(uid, role);
    return { success: true, message: `Usuário ${uid} agora é ${role}.` };
  } catch (error) {
    logger.error("Erro ao definir role:", error);
    throw new HttpsError("internal", "Erro ao definir o papel do usuário.");
  }
});
