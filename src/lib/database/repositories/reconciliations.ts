import "server-only";

import {
  demoAtms,
  demoBanks,
  demoProfiles,
  demoReconciliations,
} from "@/lib/database/demo/dataset";
import { matchesSearch, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError, notFound } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type {
  Reconciliation,
  ReconciliationStatus,
  ReconciliationWithRelations,
} from "@/types/domain";

const TABLE = "reconciliations";

const SELECT_WITH_RELATIONS = `
  *,
  atm:atms(atm_code, bank:banks(name)),
  performer:profiles!reconciliations_performed_by_fkey(full_name)
`;

export interface ReconciliationQuery extends ListQuery {
  date?: string;
  status?: ReconciliationStatus;
  atmId?: string;
}

function withDemoRelations(row: Reconciliation): ReconciliationWithRelations {
  const atm = demoAtms.find((entry) => entry.id === row.atm_id);
  return {
    ...row,
    atm_code: atm?.atm_code ?? null,
    bank_name: demoBanks.find((bank) => bank.id === atm?.bank_id)?.name ?? null,
    performed_by_name:
      demoProfiles.find((profile) => profile.user_id === row.performed_by)?.full_name ?? null,
  };
}

interface EmbeddedRow extends Reconciliation {
  atm?: { atm_code: string; bank?: { name: string } | null } | null;
  performer?: { full_name: string } | null;
}

function flatten(row: EmbeddedRow): ReconciliationWithRelations {
  const { atm, performer, ...rest } = row;
  return {
    ...rest,
    atm_code: atm?.atm_code ?? null,
    bank_name: atm?.bank?.name ?? null,
    performed_by_name: performer?.full_name ?? null,
  };
}

export async function listReconciliations(
  query: ReconciliationQuery = {},
): Promise<Paginated<ReconciliationWithRelations>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows = demoReconciliations
      .map(withDemoRelations)
      .filter((row) => (query.date ? row.reconciliation_date === query.date : true))
      .filter((row) => (query.status ? row.status === query.status : true))
      .filter((row) => (query.atmId ? row.atm_id === query.atmId : true))
      .filter((row) =>
        matchesSearch(row, query.search, [(r) => r.atm_code, (r) => r.bank_name]),
      );
    return pageOf(sortRows(rows, (r) => r.atm_code, "asc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from(TABLE)
    .select(SELECT_WITH_RELATIONS, { count: "exact" })
    .order("reconciliation_date", { ascending: false })
    .range(from, from + pageSize - 1);

  if (query.date) builder = builder.eq("reconciliation_date", query.date);
  if (query.status) builder = builder.eq("status", query.status);
  if (query.atmId) builder = builder.eq("atm_id", query.atmId);

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing reconciliations");

  const total = count ?? 0;
  return {
    data: ((data ?? []) as unknown as EmbeddedRow[]).map(flatten),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getReconciliation(
  id: string,
): Promise<ReconciliationWithRelations> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const row = demoReconciliations.find((entry) => entry.id === id);
    if (!row) throw notFound("Reconciliation");
    return withDemoRelations(row);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_WITH_RELATIONS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Loading reconciliation");
  if (!data) throw notFound("Reconciliation");
  return flatten(data as unknown as EmbeddedRow);
}

export interface ReconciliationSummary {
  total: number;
  reconciled: number;
  pending: number;
  variances: number;
  escalated: number;
  /** Sum of absolute variances in minor units. Aggregated, never re-derived. */
  totalVarianceMinor: number;
}

export async function summariseReconciliations(
  date: string,
): Promise<ReconciliationSummary> {
  const supabase = await getServerSupabase();

  const rows: Array<Pick<Reconciliation, "status" | "variance_minor">> = supabase
    ? await (async () => {
        const { data, error } = await supabase
          .from(TABLE)
          .select("status, variance_minor")
          .eq("reconciliation_date", date);
        if (error) throw fromDatabaseError(error, "Summarising reconciliations");
        return (data ?? []) as Array<Pick<Reconciliation, "status" | "variance_minor">>;
      })()
    : demoReconciliations.filter((row) => row.reconciliation_date === date);

  return {
    total: rows.length,
    reconciled: rows.filter((row) => row.status === "RECONCILED").length,
    pending: rows.filter((row) => row.status === "PENDING" || row.status === "IN_PROGRESS")
      .length,
    variances: rows.filter((row) => row.status === "VARIANCE").length,
    escalated: rows.filter((row) => row.status === "ESCALATED").length,
    totalVarianceMinor: rows.reduce(
      (sum, row) => sum + Math.abs(row.variance_minor ?? 0),
      0,
    ),
  };
}
