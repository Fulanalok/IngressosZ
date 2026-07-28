/* eslint-disable require-jsdoc, complexity */
import { randomUUID } from "node:crypto";
import type { AuthClaims, UserRole } from "./authorization.js";

export const ROLE_CHANGE_ERROR_CODES = {
  authUserNotFound: "AUTH_USER_NOT_FOUND",
  authLookup: "AUTH_LOOKUP_FAILED",
  setClaims: "AUTH_SET_CLAIMS_FAILED",
  revoke: "AUTH_REVOKE_FAILED",
  finalizeConflict: "FINALIZE_CONFLICT",
  finalize: "FINALIZE_FAILED",
} as const;

export type LegacyAuthorization =
  | { kind: "common" }
  | { kind: "privileged"; role: Exclude<UserRole, "user"> }
  | { kind: "contradictory" };

export interface RoleReservation {
  targetUid: string;
  previousRole: UserRole;
  desiredRole: UserRole;
  roleVersion: number;
  operationId: string;
  completed: boolean;
}

export interface RoleChangeRepository {
  reserve(input: {
    targetUid: string;
    desiredRole: UserRole;
    requestedBy: string;
    operationId: string;
  }): Promise<RoleReservation | null>;
  initializeLegacy(input: {
    targetUid: string;
    desiredRole: UserRole;
    requestedBy: string;
    operationId: string;
    discovery: LegacyAuthorization;
  }): Promise<RoleReservation>;
  markFailed(
    reservation: RoleReservation,
    errorCode: string
  ): Promise<void>;
  finalize(reservation: RoleReservation): Promise<void>;
}

export interface RoleAuthGateway {
  getClaims(uid: string): Promise<AuthClaims>;
  setClaims(uid: string, claims: AuthClaims): Promise<void>;
  revokeRefreshTokens(uid: string): Promise<void>;
}

export interface RoleChangeDependencies {
  repository: RoleChangeRepository;
  auth: RoleAuthGateway;
  operationId(): string;
}

export interface RoleChangeResult {
  success: true;
  role: UserRole;
  roleVersion: number;
  operationId: string;
  resumed: boolean;
}

export class RoleChangeFailure extends Error {
  constructor(
    public readonly code: string,
    message: string
  ) {
    super(message);
  }
}

export function classifyLegacyAuthorization(
  claims: AuthClaims
): LegacyAuthorization {
  if (claims.role === "admin") {
    return claims.admin === true ?
      { kind: "privileged", role: "admin" } :
      { kind: "contradictory" };
  }
  if (claims.role === "organizer" || claims.role === "validator") {
    return claims.admin === true ?
      { kind: "contradictory" } :
      { kind: "privileged", role: claims.role };
  }
  if (claims.admin === true) return { kind: "contradictory" };
  return { kind: "common" };
}

export function authLookupErrorCode(error: unknown): string {
  return typeof error === "object" && error !== null &&
    "code" in error && error.code === "auth/user-not-found" ?
    ROLE_CHANGE_ERROR_CODES.authUserNotFound :
    ROLE_CHANGE_ERROR_CODES.authLookup;
}

async function fail(
  repository: RoleChangeRepository,
  reservation: RoleReservation,
  code: string,
  error: unknown
): Promise<never> {
  try {
    await repository.markFailed(reservation, code);
  } catch {
    // The original Auth/finalization code is the actionable failure.
  }
  throw new RoleChangeFailure(
    code,
    error instanceof Error ? error.message : "Role change failed"
  );
}

export async function executeRoleChange(
  targetUid: string,
  desiredRole: UserRole,
  requestedBy: string,
  dependencies: RoleChangeDependencies
): Promise<RoleChangeResult> {
  const operationId = dependencies.operationId();
  let reservation = await dependencies.repository.reserve({
    targetUid,
    desiredRole,
    requestedBy,
    operationId,
  });
  let existingClaims: AuthClaims | null = null;
  if (reservation === null) {
    try {
      existingClaims = await dependencies.auth.getClaims(targetUid);
    } catch (error) {
      throw new RoleChangeFailure(
        authLookupErrorCode(error),
        error instanceof Error ? error.message : "Auth lookup failed"
      );
    }
    const discovery = classifyLegacyAuthorization(existingClaims);
    reservation = await dependencies.repository.initializeLegacy({
      targetUid,
      desiredRole,
      requestedBy,
      operationId,
      discovery,
    });
  }
  if (reservation.completed) {
    return {
      success: true,
      role: desiredRole,
      roleVersion: reservation.roleVersion,
      operationId: reservation.operationId,
      resumed: true,
    };
  }

  if (existingClaims === null) {
    try {
      existingClaims = await dependencies.auth.getClaims(targetUid);
    } catch (error) {
      return fail(
        dependencies.repository,
        reservation,
        authLookupErrorCode(error),
        error
      );
    }
  }

  const claims = {
    ...existingClaims,
    role: desiredRole,
    admin: desiredRole === "admin",
    roleVersion: reservation.roleVersion,
  };
  try {
    await dependencies.auth.setClaims(targetUid, claims);
  } catch (error) {
    return fail(
      dependencies.repository,
      reservation,
      ROLE_CHANGE_ERROR_CODES.setClaims,
      error
    );
  }
  try {
    await dependencies.auth.revokeRefreshTokens(targetUid);
  } catch (error) {
    return fail(
      dependencies.repository,
      reservation,
      ROLE_CHANGE_ERROR_CODES.revoke,
      error
    );
  }
  try {
    await dependencies.repository.finalize(reservation);
  } catch (error) {
    const code = error instanceof RoleChangeFailure &&
      error.code === ROLE_CHANGE_ERROR_CODES.finalizeConflict ?
      ROLE_CHANGE_ERROR_CODES.finalizeConflict :
      ROLE_CHANGE_ERROR_CODES.finalize;
    return fail(dependencies.repository, reservation, code, error);
  }

  return {
    success: true,
    role: desiredRole,
    roleVersion: reservation.roleVersion,
    operationId: reservation.operationId,
    resumed: false,
  };
}

export const defaultOperationId = () => randomUUID();
