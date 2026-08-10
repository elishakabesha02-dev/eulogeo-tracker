import "server-only";

import {
  demoAtms,
  demoBanks,
  demoBranches,
  demoCustodians,
  demoEngineers,
} from "@/lib/database/demo/dataset";
import { matchesSearch, newId, nowIso, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError, notFound } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type { Atm, AtmStatus, AtmWithRelations } from "@/types/domain";

const TABLE = "atms";

/**
 * Supabase embeds the related rows; the flattening below produces the same
 * `AtmWithRelations` shape the demo adapter builds by hand.
 */
const SELECT_WITH_RELATIONS = `
  *,
  bank:banks(name),
  branch:branches(name),
  custodian:custodians(full_name),
  engineer:engineers(full_name)
`;

export interface AtmListQuery extends ListQuery {
  status?: AtmStatus;
  bankId?: string;
}

export interface AtmInput {
  atm_code: string;
  bank_id: string;
  branch_id: string | null;
  location: string;
  status: AtmStatus;
  custodian_id: string | null;
  engineer_id: string | null;
  model: string | null;
  notes: string | null;
}

const demoRows: Atm[] = [...demoAtms];

function withDemoRelations(atm: Atm): AtmWithRelations {
  return {
    ...atm,
    bank_name: demoBanks.find((bank) => bank.id === atm.bank_id)?.name ?? null,
    branch_name:
      demoBranches.find((branch) => branch.id === atm.branch_id)?.name ?? null,
    custodian_name:
      demoCustodians.find((person) => person.id === atm.custodian_id)?.full_name ?? null,
    engineer_name:
      demoEngineers.find((person) => person.id === atm.engineer_id)?.full_name ?? null,
  };
}

interface EmbeddedAtmRow extends Atm {
  bank?: { name: string } | null;
  branch?: { name: string } | null;
  custodian?: { full_name: string } | null;
  engineer?: { full_name: string } | null;
}

function flatten(row: EmbeddedAtmRow): AtmWithRelations {
  const { bank, branch, custodian, engineer, ...rest } = row;
  return {
    ...rest,
    bank_name: bank?.name ?? null,
    branch_name: branch?.name ?? null,
    custodian_name: custodian?.full_name ?? null,
    engineer_name: engineer?.full_name ?? null,
  };
}

export async function listAtms(
  query: AtmListQuery = {},
): Promise<Paginated<AtmWithRelations>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows = demoRows
      .map(withDemoRelations)
      .filter((atm) => (query.status ? atm.status === query.status : true))
      .filter((atm) => (query.bankId ? atm.bank_id === query.bankId : true))
      .filter((atm) =>
        matchesSearch(atm, query.search, [
          (a) => a.atm_code,
          (a) => a.location,
          (a) => a.bank_name,
          (a) => a.custodian_name,
          (a) => a.engineer_name,
        ]),
      );
    return pageOf(sortRows(rows, (a) => a.atm_code, "asc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from(TABLE)
    .select(SELECT_WITH_RELATIONS, { count: "exact" })
    .order("atm_code", { ascending: true })
    .range(from, from + pageSize - 1);

  if (query.status) builder = builder.eq("status", query.status);
  if (query.bankId) builder = builder.eq("bank_id", query.bankId);
  if (query.search?.trim()) {
    const term = query.search.trim();
    builder = builder.or(`atm_code.ilike.%${term}%,location.ilike.%${term}%`);
  }

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing ATMs");

  const total = count ?? 0;
  return {
    data: ((data ?? []) as unknown as EmbeddedAtmRow[]).map(flatten),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getAtm(id: string): Promise<AtmWithRelations> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const atm = demoRows.find((row) => row.id === id || row.atm_code === id);
    if (!atm) throw notFound("ATM");
    return withDemoRelations(atm);
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select(SELECT_WITH_RELATIONS)
    .eq("id", id)
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Loading ATM");
  if (!data) throw notFound("ATM");
  return flatten(data as unknown as EmbeddedAtmRow);
}

export async function createAtm(input: AtmInput): Promise<Atm> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const timestamp = nowIso();
    const atm: Atm = { id: newId(), ...input, created_at: timestamp, updated_at: timestamp };
    demoRows.unshift(atm);
    return atm;
  }

  const { data, error } = await supabase.from(TABLE).insert(input).select("*").single();
  if (error) throw fromDatabaseError(error, "Creating ATM");
  return data as Atm;
}

export async function updateAtm(id: string, input: Partial<AtmInput>): Promise<Atm> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const index = demoRows.findIndex((row) => row.id === id);
    if (index === -1) throw notFound("ATM");
    const updated: Atm = { ...(demoRows[index] as Atm), ...input, updated_at: nowIso() };
    demoRows[index] = updated;
    return updated;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Updating ATM");
  if (!data) throw notFound("ATM");
  return data as Atm;
}

export async function countAtms(): Promise<{ total: number; active: number }> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return {
      total: demoRows.length,
      active: demoRows.filter((atm) => atm.status === "ACTIVE").length,
    };
  }

  const [totalResult, activeResult] = await Promise.all([
    supabase.from(TABLE).select("id", { count: "exact", head: true }),
    supabase.from(TABLE).select("id", { count: "exact", head: true }).eq("status", "ACTIVE"),
  ]);

  if (totalResult.error) throw fromDatabaseError(totalResult.error, "Counting ATMs");
  if (activeResult.error) throw fromDatabaseError(activeResult.error, "Counting ATMs");

  return { total: totalResult.count ?? 0, active: activeResult.count ?? 0 };
}
