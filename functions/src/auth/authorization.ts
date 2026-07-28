/* eslint-disable require-jsdoc, valid-jsdoc, max-len */
import { getFirestore } from "firebase-admin/firestore";
import { HttpsError } from "firebase-functions/v2/https";

export const USER_ROLES = ["user", "organizer", "validator", "admin"] as const;
export type UserRole = (typeof USER_ROLES)[number];
export type AuthClaims = Record<string, unknown>;

export interface AuthIdentity {
  uid: string;
  token: AuthClaims;
}

export interface AuthorizedIdentity extends AuthIdentity {
  role: UserRole;
  roleVersion: number;
}

export interface AuthorizationRecord {
  role?: unknown;
  roleVersion?: unknown;
  status?: unknown;
}

export interface AuthorizationReader {
  getAuthorization(uid: string): Promise<AuthorizationRecord | null>;
}

export interface EventAuthorizationReader {
  getEvent(eventId: string): Promise<{ organizerId?: string } | null>;
  getValidatorAssignment(
    eventId: string,
    userId: string
  ): Promise<{ userId?: string; active?: boolean } | null>;
}

const firestoreAuthorizationReader: AuthorizationReader = {
  async getAuthorization(uid) {
    const snapshot = await getFirestore().collection("authorization").doc(uid).get();
    return snapshot.exists ? snapshot.data() ?? null : null;
  },
};

export function claimRole(token: AuthClaims): UserRole | null {
  return USER_ROLES.includes(token.role as UserRole) ?
    token.role as UserRole :
    null;
}

export function claimRoleVersion(token: AuthClaims): number | null {
  return typeof token.roleVersion === "number" &&
    Number.isSafeInteger(token.roleVersion) &&
    token.roleVersion > 0 ?
    token.roleVersion :
    null;
}

export function hasConsistentAdminFlag(token: AuthClaims, role: UserRole) {
  return role === "admin" ? token.admin === true : token.admin !== true;
}

/**
 * Validates claims against the current fail-closed authorization record.
 */
export async function authorizeIdentity(
  identity: AuthIdentity | undefined,
  allowedRoles: readonly UserRole[],
  reader: AuthorizationReader = firestoreAuthorizationReader
): Promise<AuthorizedIdentity> {
  if (!identity) {
    throw new HttpsError("unauthenticated", "Autenticação obrigatória.");
  }

  const role = claimRole(identity.token);
  const roleVersion = claimRoleVersion(identity.token);
  const authorization = await reader.getAuthorization(identity.uid);
  const valid = authorization !== null &&
    authorization.status === "active" &&
    role !== null &&
    roleVersion !== null &&
    authorization.role === role &&
    authorization.roleVersion === roleVersion &&
    hasConsistentAdminFlag(identity.token, role) &&
    allowedRoles.includes(role);

  if (!valid) {
    throw new HttpsError(
      "permission-denied",
      "Autorização ausente, desatualizada ou inválida."
    );
  }

  return { ...identity, role, roleVersion };
}

export async function requireCurrentAdmin(
  identity: AuthIdentity | undefined,
  reader?: AuthorizationReader
) {
  return authorizeIdentity(identity, ["admin"], reader);
}

/**
 * Checks event ownership/assignment after current authorization was validated.
 */
export async function canValidateEvent(
  identity: AuthorizedIdentity,
  eventId: string,
  reader: EventAuthorizationReader
): Promise<boolean> {
  if (identity.role === "admin") return true;

  if (identity.role === "organizer") {
    const event = await reader.getEvent(eventId);
    return event?.organizerId === identity.uid;
  }

  if (identity.role === "validator") {
    const assignment = await reader.getValidatorAssignment(eventId, identity.uid);
    return assignment?.userId === identity.uid && assignment.active === true;
  }

  return false;
}
