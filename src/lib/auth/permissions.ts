import type { AppUser, Permission, Role } from "@/types/auth";

/**
 * Phase-1 permission model: a static role → permission matrix.
 *
 * Callers only ever ask `can(user, "atm:write")`. When scoping becomes real
 * (per-bank, per-region, delegated approvals), only this file changes.
 */
const READ_ONLY: Permission[] = [
  "atm:read",
  "bank:read",
  "people:read",
  "operations:read",
  "reconciliation:read",
  "exception:read",
  "document:read",
  "report:read",
  "notification:read",
];

const ROLE_PERMISSIONS: Record<Role, readonly Permission[]> = {
  ADMIN: [
    ...READ_ONLY,
    "atm:write",
    "bank:write",
    "people:write",
    "operations:write",
    "reconciliation:write",
    "exception:write",
    "document:write",
    "report:write",
    "ai:use",
    "audit:read",
    "settings:read",
    "settings:write",
  ],
  SUPERVISOR: [
    ...READ_ONLY,
    "atm:write",
    "operations:write",
    "reconciliation:write",
    "exception:write",
    "document:write",
    "report:write",
    "ai:use",
    "audit:read",
    "settings:read",
  ],
  RECONCILIATION_OFFICER: [
    ...READ_ONLY,
    "operations:write",
    "reconciliation:write",
    "exception:write",
    "document:write",
    "report:write",
    "ai:use",
  ],
  CCT: [...READ_ONLY, "operations:write", "document:write", "ai:use"],
  AUDITOR: [...READ_ONLY, "audit:read"],
};

export function permissionsForRole(role: Role): readonly Permission[] {
  return ROLE_PERMISSIONS[role] ?? [];
}

export function can(
  user: Pick<AppUser, "profile"> | null,
  permission: Permission,
): boolean {
  if (!user) return false;
  if (!user.profile.is_active) return false;
  return permissionsForRole(user.profile.role).includes(permission);
}

export function canAny(
  user: Pick<AppUser, "profile"> | null,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => can(user, permission));
}

export function hasRole(
  user: Pick<AppUser, "profile"> | null,
  ...roles: Role[]
): boolean {
  return Boolean(user && roles.includes(user.profile.role));
}
