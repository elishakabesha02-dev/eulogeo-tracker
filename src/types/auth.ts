import type { Entity, ISODateString, UUID } from "./common";

/**
 * Roles are intentionally a flat enum for this phase. Permission checks go
 * through `lib/auth/permissions.ts` so that a richer model (per-bank scoping,
 * per-module grants) can replace the implementation without touching callers.
 */
export const ROLES = [
  "ADMIN",
  "SUPERVISOR",
  "RECONCILIATION_OFFICER",
  "CCT",
  "AUDITOR",
] as const;

export type Role = (typeof ROLES)[number];

export const ROLE_LABELS: Record<Role, string> = {
  ADMIN: "Administrator",
  SUPERVISOR: "Supervisor",
  RECONCILIATION_OFFICER: "Reconciliation Officer",
  CCT: "Cash Centre Team",
  AUDITOR: "Auditor",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  ADMIN: "Full access to every module, including system settings and user management.",
  SUPERVISOR: "Oversees daily operations, approves reconciliations and escalations.",
  RECONCILIATION_OFFICER: "Performs reconciliation and works exception queues.",
  CCT: "Cash centre operations — custodian coordination and cash movement records.",
  AUDITOR: "Read-only access across operational data and audit logs.",
};

/**
 * The application-facing user. Composed from Supabase `auth.users` plus the
 * `profiles` row, so the rest of the app never touches the auth schema directly.
 */
export interface AppUser {
  id: UUID;
  email: string;
  profile: Profile;
}

export interface Profile extends Entity {
  user_id: UUID;
  full_name: string;
  email: string;
  role: Role;
  phone: string | null;
  job_title: string | null;
  avatar_url: string | null;
  is_active: boolean;
  last_seen_at: ISODateString | null;
}

export interface SessionContext {
  user: AppUser | null;
  /** True when no Supabase project is configured and the app runs on demo data. */
  isDemo: boolean;
}

/** A single named capability. Extend this union as modules gain real actions. */
export type Permission =
  | "atm:read"
  | "atm:write"
  | "bank:read"
  | "bank:write"
  | "people:read"
  | "people:write"
  | "operations:read"
  | "operations:write"
  | "reconciliation:read"
  | "reconciliation:write"
  | "exception:read"
  | "exception:write"
  | "document:read"
  | "document:write"
  | "report:read"
  | "report:write"
  | "ai:use"
  | "notification:read"
  | "audit:read"
  | "settings:read"
  | "settings:write";
