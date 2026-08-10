export const APP_NAME =
  process.env.NEXT_PUBLIC_APP_NAME ?? "EBB ATM Operations Intelligence";

export const APP_SHORT_NAME = "EBB";
export const APP_TAGLINE = "ATM Operations Intelligence";

/** Default currency used for display when a record does not carry its own. */
export const DEFAULT_CURRENCY = "UGX";

export const DEFAULT_PAGE_SIZE = 10;
export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/** Documents module. Enforced on both the client and the server. */
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB

export const ALLOWED_UPLOAD_MIME_TYPES = [
  "application/pdf",
  "text/csv",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "image/png",
  "image/jpeg",
  "image/webp",
] as const;

export const ALLOWED_UPLOAD_EXTENSIONS = [
  ".pdf",
  ".csv",
  ".xls",
  ".xlsx",
  ".png",
  ".jpg",
  ".jpeg",
  ".webp",
] as const;

export const STORAGE_BUCKET =
  process.env.SUPABASE_STORAGE_BUCKET ?? "ebb-documents";
