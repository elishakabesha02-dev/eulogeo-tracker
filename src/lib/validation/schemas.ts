import { z } from "zod";

import {
  ALLOWED_UPLOAD_MIME_TYPES,
  MAX_UPLOAD_BYTES,
} from "@/config/app";
import {
  activeStatusSchema,
  businessDateSchema,
  listQuerySchema,
  optionalText,
  optionalUuid,
  phoneSchema,
  textField,
  uuidSchema,
} from "@/lib/validation/common";
import {
  ATM_STATUSES,
  DOCUMENT_TYPES,
  EXCEPTION_STATUSES,
  EXCEPTION_TYPES,
  OPERATIONAL_STATUSES,
  PRIORITIES,
  RECONCILIATION_STATUSES,
  REPORT_FORMATS,
  REPORT_TYPES,
  NOTIFICATION_TYPES,
} from "@/types/domain";

/* -------------------------------------------------------------------------- */
/*  Auth                                                                      */
/* -------------------------------------------------------------------------- */

export const loginSchema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(8, "Password must be at least 8 characters."),
});

export type LoginInput = z.infer<typeof loginSchema>;

/* -------------------------------------------------------------------------- */
/*  Banks                                                                     */
/* -------------------------------------------------------------------------- */

export const bankSchema = z.object({
  name: textField(2, 120, "Bank name"),
  code: z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .pipe(
      z
        .string()
        .min(2, "Bank code must be at least 2 characters.")
        .max(12, "Bank code must be at most 12 characters.")
        .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and hyphens only."),
    ),
  status: activeStatusSchema.default("ACTIVE"),
});

export const bankQuerySchema = listQuerySchema.extend({
  status: activeStatusSchema.optional(),
});

export type BankFormInput = z.infer<typeof bankSchema>;

/* -------------------------------------------------------------------------- */
/*  ATMs                                                                      */
/* -------------------------------------------------------------------------- */

export const atmSchema = z.object({
  atm_code: z
    .string()
    .transform((value) => value.trim().toUpperCase())
    .pipe(
      z
        .string()
        .min(3, "ATM ID must be at least 3 characters.")
        .max(32, "ATM ID must be at most 32 characters.")
        .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and hyphens only."),
    ),
  bank_id: uuidSchema,
  branch_id: optionalUuid,
  location: textField(3, 200, "Location"),
  status: z.enum(ATM_STATUSES).default("ACTIVE"),
  custodian_id: optionalUuid,
  engineer_id: optionalUuid,
  model: optionalText(80, "Model"),
  notes: optionalText(500, "Notes"),
});

export const atmQuerySchema = listQuerySchema.extend({
  status: z.enum(ATM_STATUSES).optional(),
  bankId: uuidSchema.optional(),
});

export type AtmFormInput = z.infer<typeof atmSchema>;

/* -------------------------------------------------------------------------- */
/*  People                                                                    */
/* -------------------------------------------------------------------------- */

const employeeIdSchema = z
  .string()
  .transform((value) => value.trim().toUpperCase())
  .pipe(
    z
      .string()
      .min(3, "Employee ID must be at least 3 characters.")
      .max(24, "Employee ID must be at most 24 characters.")
      .regex(/^[A-Z0-9-]+$/, "Use letters, numbers and hyphens only."),
  );

export const custodianSchema = z.object({
  full_name: textField(2, 120, "Full name"),
  employee_id: employeeIdSchema,
  phone: phoneSchema,
  status: activeStatusSchema.default("ACTIVE"),
  bank_id: optionalUuid,
});

export const engineerSchema = z.object({
  full_name: textField(2, 120, "Full name"),
  employee_id: employeeIdSchema,
  phone: phoneSchema,
  status: activeStatusSchema.default("ACTIVE"),
  specialization: optionalText(80, "Specialization"),
});

export const personQuerySchema = listQuerySchema.extend({
  status: activeStatusSchema.optional(),
});

export type CustodianFormInput = z.infer<typeof custodianSchema>;
export type EngineerFormInput = z.infer<typeof engineerSchema>;

/* -------------------------------------------------------------------------- */
/*  Operations & reconciliation                                               */
/* -------------------------------------------------------------------------- */

export const dailyOperationQuerySchema = listQuerySchema.extend({
  date: businessDateSchema.optional(),
  operationalStatus: z.enum(OPERATIONAL_STATUSES).optional(),
  reconciliationStatus: z.enum(RECONCILIATION_STATUSES).optional(),
});

export const reconciliationQuerySchema = listQuerySchema.extend({
  date: businessDateSchema.optional(),
  status: z.enum(RECONCILIATION_STATUSES).optional(),
  atmId: uuidSchema.optional(),
});

/* -------------------------------------------------------------------------- */
/*  Exceptions                                                                */
/* -------------------------------------------------------------------------- */

export const exceptionQuerySchema = listQuerySchema.extend({
  status: z.enum(EXCEPTION_STATUSES).optional(),
  type: z.enum(EXCEPTION_TYPES).optional(),
  priority: z.enum(PRIORITIES).optional(),
});

/* -------------------------------------------------------------------------- */
/*  Documents                                                                 */
/* -------------------------------------------------------------------------- */

export const documentQuerySchema = listQuerySchema.extend({
  documentType: z.enum(DOCUMENT_TYPES).optional(),
});

/**
 * Server-side upload guard. The MIME type reported by the browser is not
 * trusted on its own — the extension must agree with it, and the size cap is
 * enforced here as well as in the storage bucket policy.
 */
export const documentUploadSchema = z.object({
  file_name: z
    .string()
    .trim()
    .min(1, "A file name is required.")
    .max(255, "File name is too long.")
    // Reject path separators and traversal outright rather than sanitising.
    .regex(/^[^/\\]+$/, "File name must not contain path separators.")
    .refine((value) => !value.includes(".."), "File name must not contain '..'."),
  mime_type: z.enum(ALLOWED_UPLOAD_MIME_TYPES, {
    message: "That file type is not supported.",
  }),
  size_bytes: z
    .number()
    .int()
    .positive("File appears to be empty.")
    .max(MAX_UPLOAD_BYTES, "File exceeds the maximum upload size."),
  document_type: z.enum(DOCUMENT_TYPES).default("OTHER"),
  atm_id: optionalUuid,
  bank_id: optionalUuid,
});

export type DocumentUploadInput = z.infer<typeof documentUploadSchema>;

/* -------------------------------------------------------------------------- */
/*  Reports                                                                   */
/* -------------------------------------------------------------------------- */

export const reportQuerySchema = listQuerySchema.extend({
  type: z.enum(REPORT_TYPES).optional(),
});

export const reportRequestSchema = z.object({
  type: z.enum(REPORT_TYPES),
  format: z.enum(REPORT_FORMATS).default("PDF"),
  period_start: businessDateSchema,
  period_end: businessDateSchema,
});

/* -------------------------------------------------------------------------- */
/*  Notifications & audit                                                     */
/* -------------------------------------------------------------------------- */

export const notificationQuerySchema = listQuerySchema.extend({
  type: z.enum(NOTIFICATION_TYPES).optional(),
  unreadOnly: z
    .union([z.boolean(), z.literal("true"), z.literal("false")])
    .transform((value) => value === true || value === "true")
    .optional(),
});

export const auditQuerySchema = listQuerySchema.extend({
  action: z.string().max(64).optional(),
  entity: z.string().max(64).optional(),
});

/* -------------------------------------------------------------------------- */
/*  AI                                                                        */
/* -------------------------------------------------------------------------- */

export const aiMessageSchema = z.object({
  conversationId: uuidSchema.nullable().optional(),
  message: z
    .string()
    .trim()
    .min(1, "Type a message first.")
    .max(4000, "Message is too long."),
});

export type AiMessageInput = z.infer<typeof aiMessageSchema>;
