import "server-only";

import {
  demoAtms,
  demoBanks,
  demoCustodians,
  demoDailyOperations,
} from "@/lib/database/demo/dataset";
import { matchesSearch, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type {
  DailyOperation,
  DailyOperationWithRelations,
  OperationalStatus,
  ReconciliationStatus,
} from "@/types/domain";

const TABLE = "daily_operations";

const SELECT_WITH_RELATIONS = `
  *,
  atm:atms(atm_code, location, bank:banks(name)),
  custodian:custodians(full_name)
`;

export interface DailyOperationQuery extends ListQuery {
  date?: string;
  operationalStatus?: OperationalStatus;
  reconciliationStatus?: ReconciliationStatus;
}

function withDemoRelations(
  operation: DailyOperation,
): DailyOperationWithRelations {
  const atm = demoAtms.find((row) => row.id === operation.atm_id);
  return {
    ...operation,
    atm_code: atm?.atm_code ?? null,
    location: atm?.location ?? null,
    bank_name: demoBanks.find((bank) => bank.id === atm?.bank_id)?.name ?? null,
    custodian_name:
      demoCustodians.find((person) => person.id === operation.custodian_id)?.full_name ??
      null,
  };
}

interface EmbeddedRow extends DailyOperation {
  atm?: {
    atm_code: string;
    location: string;
    bank?: { name: string } | null;
  } | null;
  custodian?: { full_name: string } | null;
}

function flatten(row: EmbeddedRow): DailyOperationWithRelations {
  const { atm, custodian, ...rest } = row;
  return {
    ...rest,
    atm_code: atm?.atm_code ?? null,
    location: atm?.location ?? null,
    bank_name: atm?.bank?.name ?? null,
    custodian_name: custodian?.full_name ?? null,
  };
}

export async function listDailyOperations(
  query: DailyOperationQuery = {},
): Promise<Paginated<DailyOperationWithRelations>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows = demoDailyOperations
      .map(withDemoRelations)
      .filter((row) => (query.date ? row.operation_date === query.date : true))
      .filter((row) =>
        query.operationalStatus ? row.operational_status === query.operationalStatus : true,
      )
      .filter((row) =>
        query.reconciliationStatus
          ? row.reconciliation_status === query.reconciliationStatus
          : true,
      )
      .filter((row) =>
        matchesSearch(row, query.search, [
          (r) => r.atm_code,
          (r) => r.bank_name,
          (r) => r.custodian_name,
          (r) => r.location,
        ]),
      );

    const sorted = sortRows(rows, (r) => `${r.operation_date}|${r.atm_code}`, "desc");
    return pageOf(sorted, query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from(TABLE)
    .select(SELECT_WITH_RELATIONS, { count: "exact" })
    .order("operation_date", { ascending: false })
    .range(from, from + pageSize - 1);

  if (query.date) builder = builder.eq("operation_date", query.date);
  if (query.operationalStatus) {
    builder = builder.eq("operational_status", query.operationalStatus);
  }
  if (query.reconciliationStatus) {
    builder = builder.eq("reconciliation_status", query.reconciliationStatus);
  }

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing daily operations");

  const total = count ?? 0;
  return {
    data: ((data ?? []) as unknown as EmbeddedRow[]).map(flatten),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Status counts for a business date, used by the dashboard tiles. */
export async function countOperationsByReconciliationStatus(
  date: string,
): Promise<Record<ReconciliationStatus, number>> {
  const empty: Record<ReconciliationStatus, number> = {
    PENDING: 0,
    IN_PROGRESS: 0,
    RECONCILED: 0,
    VARIANCE: 0,
    ESCALATED: 0,
  };

  const supabase = await getServerSupabase();

  if (!supabase) {
    for (const operation of demoDailyOperations) {
      if (operation.operation_date !== date) continue;
      empty[operation.reconciliation_status] += 1;
    }
    return empty;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("reconciliation_status")
    .eq("operation_date", date);

  if (error) throw fromDatabaseError(error, "Counting daily operations");

  for (const row of (data ?? []) as Array<{ reconciliation_status: ReconciliationStatus }>) {
    empty[row.reconciliation_status] += 1;
  }
  return empty;
}
