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

export const ASSIGNABLE_USER_ROLES = [
  "user",
  "organizer",
  "validator",
] as const satisfies readonly UserRole[];

type RoleChangePayload = { uid?: string; role?: UserRole };

export function parseRoleChangePayload(
  data: unknown,
  forcedRole?: UserRole
): { uid: string; role: UserRole } {
  const payload = (data ?? {}) as RoleChangePayload;
  const allowedRoles: readonly UserRole[] = forcedRole ?
    USER_ROLES : ASSIGNABLE_USER_ROLES;
  const role = forcedRole ?? payload.role;
  if (!payload.uid || !role || !allowedRoles.includes(role)) {
    throw new HttpsError(
      "invalid-argument",
      "UID e role válidos são obrigatórios."
    );
  }
  return { uid: payload.uid, role };
}

export function mapRoleChangeFailure(error: RoleChangeFailure): HttpsError {
  const conflict = error.code === "ROLE_CHANGE_CONFLICT";
  const migration = error.code === "MIGRATION_REQUIRED";
  const manualReview = error.code === "MANUAL_REVIEW_REQUIRED";
  return new HttpsError(
    conflict ? "aborted" : migration || manualReview ?
      "failed-precondition" : "internal",
    manualReview ?
      "Claims legadas contraditórias exigem revisão manual." : migration ?
        "Usuário privilegiado legado requer migração antes da alteração." :
        conflict ?
          "Há outra mudança de role pendente para este usuário." :
          `Falha recuperável na alteração de role (${error.code}).`,
    { roleChangeCode: error.code }
  );
}

export function roleChangeCodeFromError(error: unknown): string {
  if (error instanceof RoleChangeFailure) return error.code;
  if (error instanceof HttpsError &&
      typeof error.details === "object" && error.details !== null &&
      "roleChangeCode" in error.details &&
      typeof error.details.roleChangeCode === "string") {
    return error.details.roleChangeCode;
  }
  return "ROLE_CHANGE_FAILED";
}

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
      throw mapRoleChangeFailure(error);
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
  requesterUid: string,
  data: unknown,
  forcedRole?: UserRole
) {
  const payload = parseRoleChangePayload(data, forcedRole);
  return assignRole(requesterUid, payload.uid, payload.role);
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
    const result = await handleRoleChange(requester.uid, request.data, "admin");
    return {
      ...result,
      message: `Usuário ${(request.data as { uid: string }).uid} agora é administrador.`,
    };
  } catch (error) {
    logger.error("Falha ao definir admin", {
      code: roleChangeCodeFromError(error),
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
    const result = await handleRoleChange(requester.uid, request.data);
    return {
      ...result,
      message: `Usuário ${(request.data as { uid: string }).uid} agora é ${result.role}.`,
    };
  } catch (error) {
    logger.error("Falha ao definir role", {
      code: roleChangeCodeFromError(error),
    });
    throw error;
  }
});
