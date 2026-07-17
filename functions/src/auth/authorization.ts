export type AuthClaims = Record<string, unknown>;

export interface AuthIdentity {
  uid: string;
  token: AuthClaims;
}

export interface EventAuthorizationReader {
  getEvent(eventId: string): Promise<{ organizerId?: string } | null>;
  getValidatorAssignment(
    eventId: string,
    userId: string
  ): Promise<{ userId?: string; active?: boolean } | null>;
}

/**
 * Returns the normalized role stored in trusted custom claims.
 * @param {AuthClaims} token Authentication claims.
 * @return {string|null} Normalized role.
 */
export function claimRole(token: AuthClaims): string | null {
  return typeof token.role === "string" ? token.role.toLowerCase() : null;
}

/**
 * Returns whether trusted custom claims grant global administration.
 * @param {AuthClaims} token Authentication claims.
 * @return {boolean} Whether the identity is an admin.
 */
export function isAdminClaims(token: AuthClaims): boolean {
  return token.admin === true || claimRole(token) === "admin";
}

/**
 * Checks whether an identity may validate tickets for one event.
 * @param {AuthIdentity} identity Authenticated identity.
 * @param {string} eventId Target event.
 * @param {EventAuthorizationReader} reader Authorization data reader.
 * @return {Promise<boolean>} Whether validation is authorized.
 */
export async function canValidateEvent(
  identity: AuthIdentity,
  eventId: string,
  reader: EventAuthorizationReader
): Promise<boolean> {
  if (isAdminClaims(identity.token)) return true;

  const role = claimRole(identity.token);
  if (role === "organizer") {
    const event = await reader.getEvent(eventId);
    return event?.organizerId === identity.uid;
  }

  if (role === "validator") {
    const assignment = await reader.getValidatorAssignment(
      eventId,
      identity.uid
    );
    return assignment?.userId === identity.uid && assignment.active === true;
  }

  return false;
}
