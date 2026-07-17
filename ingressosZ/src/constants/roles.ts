export const USER_ROLES = {
  USER: "user",
  ORGANIZER: "organizer",
  VALIDATOR: "validator",
  ADMIN: "admin",
} as const;

export type UserRole = (typeof USER_ROLES)[keyof typeof USER_ROLES];

export const ALL_USER_ROLES = Object.values(USER_ROLES);

export const VALIDATOR_ROLES: UserRole[] = [
  USER_ROLES.VALIDATOR,
  USER_ROLES.ORGANIZER,
  USER_ROLES.ADMIN,
];

export const ADMIN_PANEL_ROLES: UserRole[] = [
  USER_ROLES.ORGANIZER,
  USER_ROLES.ADMIN,
];

export const ROLE_LABELS: Record<UserRole, string> = {
  [USER_ROLES.USER]: "Usuário",
  [USER_ROLES.ORGANIZER]: "Organizador",
  [USER_ROLES.VALIDATOR]: "Validador",
  [USER_ROLES.ADMIN]: "Admin",
};

export const ASSIGNABLE_ROLE_OPTIONS: Array<{
  value: UserRole;
  label: string;
}> = [
  { value: USER_ROLES.USER, label: "Usuário comum" },
  { value: USER_ROLES.VALIDATOR, label: ROLE_LABELS.validator },
  { value: USER_ROLES.ORGANIZER, label: ROLE_LABELS.organizer },
  { value: USER_ROLES.ADMIN, label: ROLE_LABELS.admin },
];

export function isUserRole(value: unknown): value is UserRole {
  return typeof value === "string" && ALL_USER_ROLES.includes(value as UserRole);
}

export function normalizeUserRole(value: unknown): UserRole {
  if (typeof value !== "string") return USER_ROLES.USER;
  const normalized = value.toLowerCase();
  return isUserRole(normalized) ? normalized : USER_ROLES.USER;
}
