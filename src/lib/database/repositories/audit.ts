import "server-only";

import { demoAuditLogs } from "@/lib/database/demo/dataset";
import { matchesSearch, newId, nowIso, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError } from "@/lib/database/errors";
import { getAdminSupabase } from "@/lib/supabase/admin";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type { AuditAction, AuditEntity, AuditLog } from "@/types/domain";

const TABLE = "audit_logs";

export interface AuditQuery extends ListQuery {
  action?: AuditAction;
  entity?: AuditEntity;
  userId?: string;
}

export interface AuditEntry {
  user_id: string | null;
  actor_email: string | null;
  action: AuditAction;
  entity: AuditEntity;
  entity_id: string | null;
  metadata?: Record<string, unknown> | null;
  ip_address?: string | null;
}

const demoRows: AuditLog[] = [...demoAuditLogs];

export async function listAuditLogs(
  query: AuditQuery = {},
): Promise<Paginated<AuditLog>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows = demoRows
      .filter((row) => (query.action ? row.action === query.action : true))
      .filter((row) => (query.entity ? row.entity === query.entity : true))
      .filter((row) => (query.userId ? row.user_id === query.userId : true))
      .filter((row) =>
        matchesSearch(row, query.search, [
          (r) => r.actor_email,
          (r) => r.action,
          (r) => r.entity,
          (r) => r.entity_id,
        ]),
      );
    return pageOf(sortRows(rows, (r) => r.created_at, "desc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 25);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (query.action) builder = builder.eq("action", query.action);
  if (query.entity) builder = builder.eq("entity", query.entity);
  if (query.userId) builder = builder.eq("user_id", query.userId);

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing audit logs");

  const total = count ?? 0;
  return {
    data: (data ?? []) as AuditLog[],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/**
 * Appends an audit entry.
 *
 * Written with the service-role client because the audit trail is append-only
 * for everyone else — no RLS policy grants INSERT to end users, which is what
 * stops a user from forging or suppressing their own entries.
 *
 * Never throws: a failure to log must not roll back the action that succeeded.
 * Failures are reported to the server console for operators to pick up.
 */
export async function recordAudit(entry: AuditEntry): Promise<void> {
  const admin = getAdminSupabase();

  if (!admin) {
    const timestamp = nowIso();
    demoRows.unshift({
      id: newId(),
      metadata: entry.metadata ?? null,
      ip_address: entry.ip_address ?? null,
      ...entry,
      created_at: timestamp,
      updated_at: timestamp,
    });
    return;
  }

  const { error } = await admin.from(TABLE).insert({
    user_id: entry.user_id,
    actor_email: entry.actor_email,
    action: entry.action,
    entity: entry.entity,
    entity_id: entry.entity_id,
    metadata: entry.metadata ?? null,
    ip_address: entry.ip_address ?? null,
  });

  if (error) {
    console.error("[audit] Failed to write audit entry", {
      action: entry.action,
      entity: entry.entity,
      code: error.code,
    });
  }
}

export async function listRecentAudit(limit = 8): Promise<AuditLog[]> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return sortRows(demoRows, (r) => r.created_at, "desc").slice(0, limit);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (error) throw fromDatabaseError(error, "Loading recent activity");
  return (data ?? []) as AuditLog[];
}
