/**
 * Primitives shared across every module.
 */

export type UUID = string;
export type ISODateString = string;

/** Records that are neither hard-deleted nor mutated in place lose the flag, not the row. */
export type ActiveStatus = "ACTIVE" | "INACTIVE";

export interface Timestamped {
  created_at: ISODateString;
  updated_at: ISODateString;
}

export interface Identified {
  id: UUID;
}

export type Entity = Identified & Timestamped;

/** Cursor-free, offset based pagination. Adequate for operational table sizes. */
export interface PaginationParams {
  page: number;
  pageSize: number;
}

export interface Paginated<T> {
  data: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

export interface ListQuery extends Partial<PaginationParams> {
  search?: string;
  sortBy?: string;
  sortDir?: "asc" | "desc";
}

/**
 * The single shape every API route returns. Clients never have to guess.
 */
export type ApiResponse<T> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  /** Field-level messages produced by Zod. Never contains raw values. */
  details?: Record<string, string[]>;
}

export type ApiErrorCode =
  | "VALIDATION_ERROR"
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "CONFLICT"
  | "RATE_LIMITED"
  | "NOT_IMPLEMENTED"
  | "INTERNAL_ERROR";

/** Where a repository read actually came from. Surfaced in the UI as a badge. */
export type DataSource = "supabase" | "demo";

export interface SelectOption {
  label: string;
  value: string;
}
