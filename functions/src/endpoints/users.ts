/* eslint-disable require-jsdoc, max-len */
import * as logger from "firebase-functions/logger";
import { HttpsError, onCall } from "firebase-functions/v2/https";
import {
  requireCurrentAdmin,
  USER_ROLES,
  type UserRole,
} from "../auth/authorization.js";
import {
  executeRoleChange,
  RoleChangeFailure,
} from "../auth/roleChange.js";
import { callableSecurityOptions } from "../config/security.js";
import { firebaseRoleChangeDependencies } from "../infrastructure/roleChangeFirebase.js";
import { checkRateLimit } from "../utils/rateLimit.js";

async function assignRole(
  requesterUid: string,
  uid: string,
  role: UserRole
) {
  assertNotSelfRoleChange(requesterUid, uid);
  try {
    return await executeRoleChange(
      uid,
      role,
      requesterUid,
      firebaseRoleChangeDependencies
    );
  } catch (error) {
    if (error instanceof RoleChangeFailure) {
      const conflict = error.code === "ROLE_CHANGE_CONFLICT";
      const migration = error.code === "MIGRATION_REQUIRED";
      const manualReview = error.code === "MANUAL_REVIEW_REQUIRED";
      throw new HttpsError(
        conflict ? "aborted" : migration || manualReview ?
          "failed-precondition" : "internal",
        manualReview ?
          "Claims legadas contraditórias exigem revisão manual." : migration ?
            "Usuário privilegiado legado requer migração antes da alteração." :
            conflict ?
              "Há outra mudança de role pendente para este usuário." :
              `Falha recuperável na alteração de role (${error.code}).`
      );
    }
    throw error;
  }
}

export function assertNotSelfRoleChange(requesterUid: string, targetUid: string) {
  if (requesterUid === targetUid) {
    throw new HttpsError(
      "failed-precondition",
      "Administradores não podem alterar a própria role."
    );
  }
}

async function handleRoleChange(
  request: {
    auth?: { uid: string; token: Record<string, unknown> };
    data?: unknown;
  },
  forcedRole?: UserRole
) {
  const requester = await requireCurrentAdmin(request.auth);
  const payload = (request.data ?? {}) as { uid?: string; role?: UserRole };
  const role = forcedRole ?? payload.role;
  if (!payload.uid || !role || !USER_ROLES.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "UID e role válidos são obrigatórios."
    );
  }
  return assignRole(requester.uid, payload.uid, role);
}

export const setAdminRole = onCall(callableSecurityOptions, async (request) => {
  const requester = await requireCurrentAdmin(request.auth);
  const allowed = await checkRateLimit(`role-admin:${requester.uid}`, 10);
  if (!allowed) {
    throw new HttpsError(
      "resource-exhausted",
      "Muitas tentativas. Aguarde um momento e tente novamente."
    );
  }
  try {
    const result = await handleRoleChange(request, "admin");
    return {
      ...result,
      message: `Usuário ${(request.data as { uid: string }).uid} agora é administrador.`,
    };
  } catch (error) {
    logger.error("Falha ao definir admin", {
      code: error instanceof RoleChangeFailure ? error.code : "ROLE_CHANGE_FAILED",
    });
    throw error;
  }
});

export const setUserRole = onCall(callableSecurityOptions, async (request) => {
  const requester = await requireCurrentAdmin(request.auth);
  const allowed = await checkRateLimit(`role-user:${requester.uid}`, 20);
  if (!allowed) {
    throw new HttpsError(
      "resource-exhausted",
      "Muitas tentativas. Aguarde um momento e tente novamente."
    );
  }
  try {
    const result = await handleRoleChange(request);
    return {
      ...result,
      message: `Usuário ${(request.data as { uid: string }).uid} agora é ${result.role}.`,
    };
  } catch (error) {
    logger.error("Falha ao definir role", {
      code: error instanceof RoleChangeFailure ? error.code : "ROLE_CHANGE_FAILED",
    });
    throw error;
  }
});
