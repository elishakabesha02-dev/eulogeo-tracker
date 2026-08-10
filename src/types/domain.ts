import type { ActiveStatus, Entity, ISODateString, UUID } from "./common";

/* -------------------------------------------------------------------------- */
/*  Banks & branches                                                          */
/* -------------------------------------------------------------------------- */

export interface Bank extends Entity {
  name: string;
  code: string;
  status: ActiveStatus;
}

export interface Branch extends Entity {
  bank_id: UUID;
  name: string;
  code: string;
  city: string | null;
  status: ActiveStatus;
}

/* -------------------------------------------------------------------------- */
/*  People                                                                    */
/* -------------------------------------------------------------------------- */

/**
 * Custodians and engineers deliberately carry the minimum identifying data
 * needed to run operations. No national IDs, addresses or bank details.
 */
export interface Custodian extends Entity {
  full_name: string;
  employee_id: string;
  phone: string | null;
  status: ActiveStatus;
  bank_id: UUID | null;
}

export interface Engineer extends Entity {
  full_name: string;
  employee_id: string;
  phone: string | null;
  status: ActiveStatus;
  specialization: string | null;
}

/* -------------------------------------------------------------------------- */
/*  ATMs                                                                      */
/* -------------------------------------------------------------------------- */

export const ATM_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "MAINTENANCE",
  "DECOMMISSIONED",
] as const;
export type AtmStatus = (typeof ATM_STATUSES)[number];

export interface Atm extends Entity {
  atm_code: string;
  bank_id: UUID;
  branch_id: UUID | null;
  location: string;
  status: AtmStatus;
  custodian_id: UUID | null;
  engineer_id: UUID | null;
  model: string | null;
  notes: string | null;
}

/** An ATM joined with the labels the tables actually display. */
export interface AtmWithRelations extends Atm {
  bank_name: string | null;
  branch_name: string | null;
  custodian_name: string | null;
  engineer_name: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Daily operations                                                          */
/* -------------------------------------------------------------------------- */

export const OPERATIONAL_STATUSES = [
  "PENDING",
  "PROCESSING",
  "COMPLETED",
  "EXCEPTION",
] as const;
export type OperationalStatus = (typeof OPERATIONAL_STATUSES)[number];

export const RECONCILIATION_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "RECONCILED",
  "VARIANCE",
  "ESCALATED",
] as const;
export type ReconciliationStatus = (typeof RECONCILIATION_STATUSES)[number];

export interface DailyOperation extends Entity {
  /** Business date the operation belongs to (YYYY-MM-DD). */
  operation_date: string;
  atm_id: UUID;
  custodian_id: UUID | null;
  operational_status: OperationalStatus;
  reconciliation_status: ReconciliationStatus;
  notes: string | null;
}

export interface DailyOperationWithRelations extends DailyOperation {
  atm_code: string | null;
  bank_name: string | null;
  custodian_name: string | null;
  location: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Reconciliation                                                            */
/* -------------------------------------------------------------------------- */

/**
 * Amounts are held as integer MINOR UNITS (cents). No floating point ever
 * touches a monetary value. The reconciliation engine in a later phase will
 * compute `variance_minor`; for now it is stored as supplied.
 */
export interface Reconciliation extends Entity {
  reconciliation_date: string;
  atm_id: UUID;
  daily_operation_id: UUID | null;
  currency: string;
  expected_minor: number | null;
  actual_minor: number | null;
  variance_minor: number | null;
  status: ReconciliationStatus;
  performed_by: UUID | null;
  completed_at: ISODateString | null;
  notes: string | null;
}

export interface ReconciliationWithRelations extends Reconciliation {
  atm_code: string | null;
  bank_name: string | null;
  performed_by_name: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Exceptions                                                                */
/* -------------------------------------------------------------------------- */

export const EXCEPTION_TYPES = [
  "SHORTAGE",
  "OVERAGE",
  "GL_MISMATCH",
  "JOURNAL_MISMATCH",
  "MISSING_DATA",
  "OTHER",
] as const;
export type ExceptionType = (typeof EXCEPTION_TYPES)[number];

export const EXCEPTION_STATUSES = [
  "OPEN",
  "INVESTIGATING",
  "ESCALATED",
  "RESOLVED",
  "CLOSED",
] as const;
export type ExceptionStatus = (typeof EXCEPTION_STATUSES)[number];

export const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"] as const;
export type Priority = (typeof PRIORITIES)[number];

export interface OpsException extends Entity {
  reference: string;
  atm_id: UUID | null;
  reconciliation_id: UUID | null;
  type: ExceptionType;
  status: ExceptionStatus;
  priority: Priority;
  currency: string;
  amount_minor: number | null;
  description: string | null;
  assigned_to: UUID | null;
  resolved_at: ISODateString | null;
}

export interface OpsExceptionWithRelations extends OpsException {
  atm_code: string | null;
  bank_name: string | null;
  assigned_to_name: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Documents                                                                 */
/* -------------------------------------------------------------------------- */

export const DOCUMENT_TYPES = [
  "GL_STATEMENT",
  "ATM_JOURNAL",
  "CASH_COUNT_SHEET",
  "INCIDENT_PHOTO",
  "OTHER",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_STATUSES = [
  "UPLOADED",
  "QUEUED",
  "PROCESSING",
  "PROCESSED",
  "FAILED",
] as const;
export type DocumentStatus = (typeof DOCUMENT_STATUSES)[number];

export interface StoredDocument extends Entity {
  file_name: string;
  /** Path inside the Supabase Storage bucket. Never a public URL. */
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  document_type: DocumentType;
  status: DocumentStatus;
  atm_id: UUID | null;
  bank_id: UUID | null;
  uploaded_by: UUID | null;
}

export interface StoredDocumentWithRelations extends StoredDocument {
  uploaded_by_name: string | null;
  atm_code: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

export const REPORT_TYPES = [
  "DAILY_RECONCILIATION",
  "EXCEPTION_REPORT",
  "ATM_OPERATIONS",
  "MONTHLY_SUMMARY",
] as const;
export type ReportType = (typeof REPORT_TYPES)[number];

export const REPORT_STATUSES = [
  "QUEUED",
  "GENERATING",
  "READY",
  "FAILED",
] as const;
export type ReportStatus = (typeof REPORT_STATUSES)[number];

export const REPORT_FORMATS = ["PDF", "XLSX", "CSV"] as const;
export type ReportFormat = (typeof REPORT_FORMATS)[number];

export interface Report extends Entity {
  name: string;
  type: ReportType;
  format: ReportFormat;
  status: ReportStatus;
  period_start: string | null;
  period_end: string | null;
  created_by: UUID | null;
  storage_path: string | null;
}

export interface ReportWithRelations extends Report {
  created_by_name: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Notifications                                                             */
/* -------------------------------------------------------------------------- */

export const NOTIFICATION_TYPES = [
  "INFO",
  "WARNING",
  "ERROR",
  "SUCCESS",
  "EXCEPTION",
] as const;
export type NotificationType = (typeof NOTIFICATION_TYPES)[number];

export interface Notification extends Entity {
  user_id: UUID | null;
  type: NotificationType;
  title: string;
  body: string | null;
  /** In-app deep link. Validated as a relative path before rendering. */
  link: string | null;
  read_at: ISODateString | null;
}

/* -------------------------------------------------------------------------- */
/*  Audit log                                                                 */
/* -------------------------------------------------------------------------- */

export const AUDIT_ACTIONS = [
  "LOGIN",
  "LOGOUT",
  "ATM_CREATED",
  "ATM_UPDATED",
  "ATM_DEACTIVATED",
  "ATM_ACTIVATED",
  "BANK_CREATED",
  "BANK_UPDATED",
  "CUSTODIAN_CREATED",
  "CUSTODIAN_UPDATED",
  "ENGINEER_CREATED",
  "ENGINEER_UPDATED",
  "DOCUMENT_UPLOADED",
  "RECONCILIATION_STARTED",
  "RECONCILIATION_COMPLETED",
  "EXCEPTION_CREATED",
  "EXCEPTION_UPDATED",
  "REPORT_CREATED",
  "SETTINGS_UPDATED",
] as const;
export type AuditAction = (typeof AUDIT_ACTIONS)[number];

export const AUDIT_ENTITIES = [
  "auth",
  "atm",
  "bank",
  "branch",
  "custodian",
  "engineer",
  "daily_operation",
  "reconciliation",
  "exception",
  "document",
  "report",
  "settings",
] as const;
export type AuditEntity = (typeof AUDIT_ENTITIES)[number];

export interface AuditLog extends Entity {
  user_id: UUID | null;
  actor_email: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entity_id: string | null;
  /** Free-form context. Must never contain secrets or full request bodies. */
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
}

/* -------------------------------------------------------------------------- */
/*  Dashboard                                                                 */
/* -------------------------------------------------------------------------- */

export interface DashboardMetrics {
  totalAtms: number;
  activeAtms: number;
  reconciled: number;
  pending: number;
  variances: number;
  escalated: number;
}

export interface ActivityItem {
  id: string;
  action: AuditAction;
  entity: AuditEntity;
  summary: string;
  actor: string;
  at: ISODateString;
}
