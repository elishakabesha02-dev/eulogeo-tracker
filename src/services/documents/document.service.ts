import "server-only";

import { STORAGE_BUCKET } from "@/config/app";
import { requirePermission } from "@/lib/auth/session";
import { recordAudit } from "@/lib/database/repositories/audit";
import {
  createDocument,
  getDocument,
  listDocuments,
  type DocumentQuery,
} from "@/lib/database/repositories/documents";
import { ServiceError, notFound } from "@/lib/database/errors";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { fieldErrors } from "@/lib/validation/common";
import { documentUploadSchema } from "@/lib/validation/schemas";
import type { Paginated } from "@/types/common";
import type { StoredDocument, StoredDocumentWithRelations } from "@/types/domain";

/**
 * Document service.
 *
 * Upload flow (two steps, so a failed transfer never leaves an orphan row):
 *   1. `prepareUpload` validates the metadata and returns a short-lived signed
 *      upload URL. The storage path is generated server-side from a UUID — the
 *      client-supplied file name is stored as a label only and never used to
 *      build a path, which removes traversal and collision risk entirely.
 *   2. `confirmUpload` records the row once the transfer has succeeded.
 *
 * OCR and AI extraction are explicitly out of scope for this phase; documents
 * land in `UPLOADED` and stay there.
 */

const EXTENSION_BY_MIME: Record<string, string> = {
  "application/pdf": "pdf",
  "text/csv": "csv",
  "application/vnd.ms-excel": "xls",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": "xlsx",
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
};

export async function getDocumentList(
  query: DocumentQuery,
): Promise<Paginated<StoredDocumentWithRelations>> {
  await requirePermission("document:read");
  return listDocuments(query);
}

export interface PreparedUpload {
  storagePath: string;
  /** Short-lived token the browser exchanges for a direct upload. */
  token: string;
  bucket: string;
}

export async function prepareUpload(input: unknown): Promise<PreparedUpload> {
  await requirePermission("document:write");

  const parsed = documentUploadSchema.safeParse(input);
  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "That file cannot be uploaded.", {
      details: fieldErrors(parsed.error),
    });
  }

  const admin = getAdminSupabase();
  if (!admin) {
    throw new ServiceError(
      "NOT_IMPLEMENTED",
      "Document storage requires a configured Supabase project. Add your Supabase credentials to enable uploads.",
    );
  }

  const extension = EXTENSION_BY_MIME[parsed.data.mime_type] ?? "bin";
  const today = new Date().toISOString().slice(0, 10);
  const storagePath = `${parsed.data.document_type.toLowerCase()}/${today}/${crypto.randomUUID()}.${extension}`;

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUploadUrl(storagePath);

  if (error || !data) {
    throw new ServiceError("INTERNAL_ERROR", "Could not start the upload.", {
      cause: error,
    });
  }

  return { storagePath, token: data.token, bucket: STORAGE_BUCKET };
}

export interface ConfirmUploadInput {
  storagePath: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  documentType: string;
  atmId?: string | null;
  bankId?: string | null;
}

export async function confirmUpload(
  input: ConfirmUploadInput,
): Promise<StoredDocument> {
  const user = await requirePermission("document:write");

  const parsed = documentUploadSchema.safeParse({
    file_name: input.fileName,
    mime_type: input.mimeType,
    size_bytes: input.sizeBytes,
    document_type: input.documentType,
    atm_id: input.atmId ?? null,
    bank_id: input.bankId ?? null,
  });

  if (!parsed.success) {
    throw new ServiceError("VALIDATION_ERROR", "That file cannot be recorded.", {
      details: fieldErrors(parsed.error),
    });
  }

  const document = await createDocument({
    file_name: parsed.data.file_name,
    storage_path: input.storagePath,
    mime_type: parsed.data.mime_type,
    size_bytes: parsed.data.size_bytes,
    document_type: parsed.data.document_type,
    atm_id: parsed.data.atm_id ?? null,
    bank_id: parsed.data.bank_id ?? null,
    uploaded_by: user.id,
  });

  await recordAudit({
    user_id: user.id,
    actor_email: user.email,
    action: "DOCUMENT_UPLOADED",
    entity: "document",
    entity_id: document.id,
    metadata: {
      file_name: document.file_name,
      document_type: document.document_type,
      size_bytes: document.size_bytes,
    },
  });

  return document;
}

/**
 * Returns a time-limited download URL. The bucket itself stays private, so a
 * leaked path is not enough to read a file.
 */
export async function getDownloadUrl(id: string): Promise<string> {
  await requirePermission("document:read");

  const document = await getDocument(id);
  const admin = getAdminSupabase();

  if (!admin) {
    throw new ServiceError(
      "NOT_IMPLEMENTED",
      "Downloads require a configured Supabase project.",
    );
  }

  const { data, error } = await admin.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(document.storage_path, 60);

  if (error || !data) throw notFound("Stored file");
  return data.signedUrl;
}
