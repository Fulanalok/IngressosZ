/* eslint-disable require-jsdoc */
import { randomUUID } from "node:crypto";
import type { AuthClaims, UserRole } from "./authorization.js";

export const ROLE_CHANGE_ERROR_CODES = {
  authUserNotFound: "AUTH_USER_NOT_FOUND",
  setClaims: "AUTH_SET_CLAIMS_FAILED",
  revoke: "AUTH_REVOKE_FAILED",
  finalizeConflict: "FINALIZE_CONFLICT",
  finalize: "FINALIZE_FAILED",
} as const;

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
    legacyRole: UserRole | null;
    force?: boolean;
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

function privilegedLegacyRole(claims: AuthClaims): UserRole | null {
  if (claims.role === "admin" || claims.admin === true) return "admin";
  if (claims.role === "organizer") return "organizer";
  if (claims.role === "validator") return "validator";
  return null;
}

async function fail(
  repository: RoleChangeRepository,
  reservation: RoleReservation,
  code: string,
  error: unknown
): Promise<never> {
  await repository.markFailed(reservation, code);
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
  let existingClaims: AuthClaims;
  try {
    existingClaims = await dependencies.auth.getClaims(targetUid);
  } catch (error) {
    const reservation = await dependencies.repository.reserve({
      targetUid,
      desiredRole,
      requestedBy,
      operationId,
      legacyRole: null,
      force: true,
    });
    if (!reservation.completed) {
      await dependencies.repository.markFailed(
        reservation,
        ROLE_CHANGE_ERROR_CODES.authUserNotFound
      );
    }
    throw new RoleChangeFailure(
      ROLE_CHANGE_ERROR_CODES.authUserNotFound,
      error instanceof Error ? error.message : "Auth user not found"
    );
  }

  const reservation = await dependencies.repository.reserve({
    targetUid,
    desiredRole,
    requestedBy,
    operationId,
    legacyRole: privilegedLegacyRole(existingClaims),
  });
  if (reservation.completed) {
    return {
      success: true,
      role: desiredRole,
      roleVersion: reservation.roleVersion,
      operationId: reservation.operationId,
      resumed: true,
    };
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
