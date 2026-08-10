import { z } from "zod";

import { DEFAULT_PAGE_SIZE, PAGE_SIZE_OPTIONS } from "@/config/app";

export const uuidSchema = z.string().uuid("Must be a valid identifier.");

export const businessDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use the format YYYY-MM-DD.");

export const activeStatusSchema = z.enum(["ACTIVE", "INACTIVE"]);

/** Coerces query-string values, which always arrive as strings. */
export const listQuerySchema = z.object({
  search: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce
    .number()
    .int()
    .min(1)
    .max(Math.max(...PAGE_SIZE_OPTIONS))
    .default(DEFAULT_PAGE_SIZE),
});

export type ListQueryInput = z.infer<typeof listQuerySchema>;

/**
 * Trims and collapses whitespace, then enforces a length. Applied to every
 * free-text field so stray whitespace never reaches the database.
 */
export function textField(min: number, max: number, label: string) {
  return z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(
      z
        .string()
        .min(min, `${label} must be at least ${min} characters.`)
        .max(max, `${label} must be at most ${max} characters.`),
    );
}

export function optionalText(max: number, label: string) {
  return z
    .string()
    .transform((value) => value.trim().replace(/\s+/g, " "))
    .pipe(z.string().max(max, `${label} must be at most ${max} characters.`))
    .transform((value) => (value === "" ? null : value))
    .nullable()
    .optional();
}

/** Permissive on formatting, strict on characters. */
export const phoneSchema = z
  .string()
  .transform((value) => value.trim())
  .pipe(
    z
      .string()
      .regex(/^[+()\d][\d\s()+-]{5,24}$/, "Enter a valid phone number.")
      .or(z.literal("")),
  )
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/** Empty select values arrive as "" and must become null, not a bad UUID. */
export const optionalUuid = z
  .union([uuidSchema, z.literal("")])
  .transform((value) => (value === "" ? null : value))
  .nullable()
  .optional();

/** Flattens Zod issues into the `details` shape used by `ApiError`. */
export function fieldErrors(error: z.ZodError): Record<string, string[]> {
  const result: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "_";
    (result[key] ??= []).push(issue.message);
  }
  return result;
}
