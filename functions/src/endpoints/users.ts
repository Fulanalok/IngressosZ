import admin from "firebase-admin";
import { getFirestore } from "firebase-admin/firestore";
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import { callableSecurityOptions } from "../config/security.js";
import { checkRateLimit } from "../utils/rateLimit.js";

export const setAdminRole = onCall(callableSecurityOptions, async (request) => {
  if (request.auth?.token.admin !== true) {
    throw new HttpsError(
      "permission-denied",
      "Apenas administradores podem realizar esta operação."
    );
  }
  const allowedAdminRole = await checkRateLimit(
    `role-admin:${request.auth.uid}`,
    10
  );
  if (!allowedAdminRole) {
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
    await admin.auth().setCustomUserClaims(uid, { admin: true, role: "admin" });
    await admin.auth().revokeRefreshTokens(uid);
    await getFirestore()
      .collection("users")
      .doc(uid)
      .set({ role: "admin" }, { merge: true });
    return { success: true, message: `Usuário ${uid} agora é administrador.` };
  } catch (error) {
    logger.error("Erro ao definir admin:", error);
    throw new HttpsError("internal", "Erro ao definir privilégios de admin.");
  }
});

export const setUserRole = onCall(callableSecurityOptions, async (request) => {
  const isAdmin = request.auth?.token.admin === true;
  const isEmulator = process.env.FUNCTIONS_EMULATOR === "true";
  if (!isAdmin) {
    if (!isEmulator || !request.auth?.uid) {
      throw new HttpsError(
        "permission-denied",
        "Apenas administradores podem realizar esta operação."
      );
    }
  }
  const requesterUid = request.auth?.uid;
  if (!requesterUid) {
    throw new HttpsError("permission-denied", "Autenticação obrigatória.");
  }
  const allowedUserRole = await checkRateLimit(
    `role-user:${requesterUid}`,
    20
  );
  if (!allowedUserRole) {
    throw new HttpsError(
      "resource-exhausted",
      "Muitas tentativas. Aguarde um momento e tente novamente."
    );
  }

  const { uid, role } = request.data as {
    uid?: string;
    role?: "organizer" | "validator" | "admin";
  };

  if (!uid || !role) {
    throw new HttpsError("invalid-argument", "UID e role são obrigatórios.");
  }

  if (!isAdmin && request.auth?.uid !== uid) {
    throw new HttpsError(
      "permission-denied",
      "No emulador, apenas o próprio usuário pode alterar o role."
    );
  }

  if (!isAdmin && role === "admin") {
    throw new HttpsError(
      "permission-denied",
      "No emulador, não é permitido promover usuário para admin."
    );
  }

  try {
    await admin.auth().setCustomUserClaims(uid, {
      role,
      admin: role === "admin",
    });
    await admin.auth().revokeRefreshTokens(uid);
    await getFirestore().collection("users").doc(uid).set(
      { role },
      { merge: true }
    );
    return { success: true, message: `Usuário ${uid} agora é ${role}.` };
  } catch (error) {
    logger.error("Erro ao definir role:", error);
    throw new HttpsError("internal", "Erro ao definir o papel do usuário.");
  }
});
