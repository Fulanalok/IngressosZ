/* eslint-disable require-jsdoc */
import type { AuthClaims, UserRole } from "./authorization.js";

export type LegacyActivePlan =
  | { kind: "not-legacy-active"; touchAuth: false }
  | { kind: "complete-active"; touchAuth: false }
  | { kind: "apply-claims"; touchAuth: true };

export function planLegacyActiveMigration(
  authorization: Record<string, unknown>,
  claims: AuthClaims,
  role: UserRole,
  operationExists: boolean
): LegacyActivePlan {
  const roleVersion = authorization.roleVersion;
  const legacyActive = authorization.status === "active" &&
    authorization.role === role &&
    Number.isSafeInteger(roleVersion) && Number(roleVersion) > 0 &&
    !operationExists;
  if (!legacyActive) return { kind: "not-legacy-active", touchAuth: false };

  const coherent = claims.role === role && claims.roleVersion === roleVersion &&
    (role === "admin" ? claims.admin === true : claims.admin !== true);
  return coherent ?
    { kind: "complete-active", touchAuth: false } :
    { kind: "apply-claims", touchAuth: true };
}
