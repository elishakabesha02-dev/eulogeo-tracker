import "server-only";

import {
  demoAtms,
  demoBanks,
  demoExceptions,
  demoProfiles,
} from "@/lib/database/demo/dataset";
import { matchesSearch, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError, notFound } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type {
  ExceptionStatus,
  ExceptionType,
  OpsException,
  OpsExceptionWithRelations,
  Priority,
} from "@/types/domain";

const TABLE = "exceptions";

const SELECT_WITH_RELATIONS = `
  *,
  atm:atms(atm_code, bank:banks(name)),
  assignee:profiles!exceptions_assigned_to_fkey(full_name)
`;

export interface ExceptionQuery extends ListQuery {
  status?: ExceptionStatus;
  type?: ExceptionType;
  priority?: Priority;
}

function withDemoRelations(row: OpsException): OpsExceptionWithRelations {
  const atm = demoAtms.find((entry) => entry.id === row.atm_id);
  return {
    ...row,
    atm_code: atm?.atm_code ?? null,
    bank_name: demoBanks.find((bank) => bank.id === atm?.bank_id)?.name ?? null,
    assigned_to_name:
      demoProfiles.find((profile) => profile.user_id === row.assigned_to)?.full_name ?? null,
  };
}

interface EmbeddedRow extends OpsException {
  atm?: { atm_code: string; bank?: { name: string } | null } | null;
  assignee?: { full_name: string } | null;
}

function flatten(row: EmbeddedRow): OpsExceptionWithRelations {
  const { atm, assignee, ...rest } = row;
  return {
    ...rest,
    atm_code: atm?.atm_code ?? null,
    bank_name: atm?.bank?.name ?? null,
    assigned_to_name: assignee?.full_name ?? null,
  };
}

const PRIORITY_ORDER: Record<Priority, number> = {
  CRITICAL: 0,
  HIGH: 1,
  MEDIUM: 2,
  LOW: 3,
};

export async function listExceptions(
  query: ExceptionQuery = {},
): Promise<Paginated<OpsExceptionWithRelations>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows = demoExceptions
      .map(withDemoRelations)
      .filter((row) => (query.status ? row.status === query.status : true))
      .filter((row) => (query.type ? row.type === query.type : true))
      .filter((row) => (query.priority ? row.priority === query.priority : true))
      .filter((row) =>
        matchesSearch(row, query.search, [
          (r) => r.reference,
          (r) => r.atm_code,
          (r) => r.bank_name,
          (r) => r.description,
        ]),
      );

    // Most urgent first, then most recent.
    const sorted = [...rows].sort(
      (a, b) =>
        PRIORITY_ORDER[a.priority] - PRIORITY_ORDER[b.priority] ||
        b.created_at.localeCompare(a.created_at),
    );
    return pageOf(sorted, query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from(TABLE)
    .select(SELECT_WITH_RELATIONS, { count: "exact" })
    .order("created_at", { ascending: false })
    .range(from, from + pageSize - 1);

  if (query.status) builder = builder.eq("status", query.status);
  if (query.type) builder = builder.eq("type", query.type);
  if (query.priority) builder = builder.eq("priority", query.priority);

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing exceptions");

  const total = count ?? 0;
  return {
    data: ((data ?? []) as unknown as EmbeddedRow[]).map(flatten),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getException(id: string): Promise<OpsExceptionWithRelations> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const row = demoExceptions.find((entry) => entry.id === id);
    if (!row) throw notFound("Exception");
    return withDemoRelations(row);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_WITH_RELATIONS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Loading exception");
  if (!data) throw notFound("Exception");
  return flatten(data as unknown as EmbeddedRow);
}

export async function countOpenExceptions(): Promise<number> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return demoExceptions.filter(
      (row) => row.status === "OPEN" || row.status === "INVESTIGATING" || row.status === "ESCALATED",
    ).length;
  }

  const { count, error } = await supabase
    .from(TABLE)
    .select("id", { count: "exact", head: true })
    .in("status", ["OPEN", "INVESTIGATING", "ESCALATED"]);

  if (error) throw fromDatabaseError(error, "Counting exceptions");
  return count ?? 0;
}

/** Sorted by urgency, used by the exceptions dashboard summary strip. */
export function sortByPriority<T extends { priority: Priority }>(rows: T[]): T[] {
  return sortRows(rows, (row) => PRIORITY_ORDER[row.priority], "asc");
}
