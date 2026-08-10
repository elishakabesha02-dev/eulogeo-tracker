import type { ApiErrorCode } from "@/types/common";

/**
 * The only error type the service layer throws. API routes translate it into a
 * typed `ApiResponse`, so no raw database error ever reaches a client.
 */
export class ServiceError extends Error {
  readonly code: ApiErrorCode;
  readonly details?: Record<string, string[]>;
  readonly status: number;

  constructor(
    code: ApiErrorCode,
    message: string,
    options?: { details?: Record<string, string[]>; cause?: unknown },
  ) {
    super(message, { cause: options?.cause });
    this.name = "ServiceError";
    this.code = code;
    this.details = options?.details;
    this.status = STATUS_BY_CODE[code];
  }
}

const STATUS_BY_CODE: Record<ApiErrorCode, number> = {
  VALIDATION_ERROR: 422,
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  RATE_LIMITED: 429,
  NOT_IMPLEMENTED: 501,
  INTERNAL_ERROR: 500,
};

export const notFound = (what: string) =>
  new ServiceError("NOT_FOUND", `${what} was not found.`);

export const forbidden = (action = "perform this action") =>
  new ServiceError("FORBIDDEN", `You do not have permission to ${action}.`);

export const unauthenticated = () =>
  new ServiceError("UNAUTHENTICATED", "You must be signed in.");

export const conflict = (message: string) =>
  new ServiceError("CONFLICT", message);

export const notImplemented = (feature: string) =>
  new ServiceError(
    "NOT_IMPLEMENTED",
    `${feature} is not implemented yet. It is scheduled for a later phase.`,
  );

/** Wraps a Supabase PostgrestError without leaking its internals. */
export function fromDatabaseError(error: unknown, context: string): ServiceError {
  const code =
    typeof error === "object" && error !== null && "code" in error
      ? String((error as { code: unknown }).code)
      : "";

  // 23505 = unique_violation
  if (code === "23505") {
    return new ServiceError("CONFLICT", `${context}: a matching record already exists.`);
  }
  // 23503 = foreign_key_violation
  if (code === "23503") {
    return new ServiceError("VALIDATION_ERROR", `${context}: a referenced record does not exist.`);
  }

  return new ServiceError("INTERNAL_ERROR", `${context} failed.`, { cause: error });
}
