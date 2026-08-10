import "server-only";

import { demoAtms, demoDocuments, demoProfiles } from "@/lib/database/demo/dataset";
import { matchesSearch, newId, nowIso, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError, notFound } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type {
  DocumentType,
  StoredDocument,
  StoredDocumentWithRelations,
} from "@/types/domain";

const TABLE = "documents";

const SELECT_WITH_RELATIONS = `
  *,
  uploader:profiles!documents_uploaded_by_fkey(full_name),
  atm:atms(atm_code)
`;

export interface DocumentQuery extends ListQuery {
  documentType?: DocumentType;
}

export interface DocumentInput {
  file_name: string;
  storage_path: string;
  mime_type: string;
  size_bytes: number;
  document_type: DocumentType;
  atm_id: string | null;
  bank_id: string | null;
  uploaded_by: string | null;
}

const demoRows: StoredDocument[] = [...demoDocuments];

function withDemoRelations(row: StoredDocument): StoredDocumentWithRelations {
  return {
    ...row,
    uploaded_by_name:
      demoProfiles.find((profile) => profile.user_id === row.uploaded_by)?.full_name ?? null,
    atm_code: demoAtms.find((atm) => atm.id === row.atm_id)?.atm_code ?? null,
  };
}

interface EmbeddedRow extends StoredDocument {
  uploader?: { full_name: string } | null;
  atm?: { atm_code: string } | null;
}

function flatten(row: EmbeddedRow): StoredDocumentWithRelations {
  const { uploader, atm, ...rest } = row;
  return {
    ...rest,
    uploaded_by_name: uploader?.full_name ?? null,
    atm_code: atm?.atm_code ?? null,
  };
}

export async function listDocuments(
  query: DocumentQuery = {},
): Promise<Paginated<StoredDocumentWithRelations>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows = demoRows
      .map(withDemoRelations)
      .filter((row) => (query.documentType ? row.document_type === query.documentType : true))
      .filter((row) =>
        matchesSearch(row, query.search, [(r) => r.file_name, (r) => r.atm_code]),
      );
    return pageOf(sortRows(rows, (r) => r.created_at, "desc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from(TABLE)
    .select(SELECT_WITH_RELATIONS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (query.documentType) builder = builder.eq("document_type", query.documentType);
  if (query.search?.trim()) {
    builder = builder.ilike("file_name", `%${query.search.trim()}%`);
  }

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing documents");

  const total = count ?? 0;
  return {
    data: ((data ?? []) as unknown as EmbeddedRow[]).map(flatten),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Records a document row. Uploading the bytes is a separate step handled by
 * `services/documents` so storage and metadata can fail independently.
 */
export async function createDocument(input: DocumentInput): Promise<StoredDocument> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const timestamp = nowIso();
    const document: StoredDocument = {
      id: newId(),
      ...input,
      status: "UPLOADED",
      created_at: timestamp,
      updated_at: timestamp,
    };
    demoRows.unshift(document);
    return document;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .insert({ ...input, status: "UPLOADED" })
    .select("*")
    .single();

  if (error) throw fromDatabaseError(error, "Recording document");
  return data as StoredDocument;
}

export async function getDocument(id: string): Promise<StoredDocument> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const row = demoRows.find((entry) => entry.id === id);
    if (!row) throw notFound("Document");
    return row;
  }

  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw fromDatabaseError(error, "Loading document");
  if (!data) throw notFound("Document");
  return data as StoredDocument;
}
