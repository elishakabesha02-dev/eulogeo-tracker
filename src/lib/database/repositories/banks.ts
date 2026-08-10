import "server-only";

import { demoBanks } from "@/lib/database/demo/dataset";
import { matchesSearch, newId, nowIso, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError, notFound } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ActiveStatus, ListQuery, Paginated } from "@/types/common";
import type { Bank } from "@/types/domain";

const TABLE = "banks";

export interface BankListQuery extends ListQuery {
  status?: ActiveStatus;
}

export interface BankInput {
  name: string;
  code: string;
  status: ActiveStatus;
}

/**
 * Demo rows live in a module-level array so in-memory writes survive within a
 * running process. They are never persisted — the UI says so explicitly.
 */
const demoRows: Bank[] = [...demoBanks];

export async function listBanks(
  query: BankListQuery = {},
): Promise<Paginated<Bank>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const filtered = demoRows
      .filter((bank) => (query.status ? bank.status === query.status : true))
      .filter((bank) =>
        matchesSearch(bank, query.search, [(b) => b.name, (b) => b.code]),
      );
    return pageOf(sortRows(filtered, (b) => b.name, "asc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("name", { ascending: true })
    .range(from, from + pageSize - 1);

  if (query.status) builder = builder.eq("status", query.status);
  if (query.search?.trim()) {
    const term = query.search.trim();
    builder = builder.or(`name.ilike.%${term}%,code.ilike.%${term}%`);
  }

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing banks");

  const total = count ?? 0;
  return {
    data: (data ?? []) as Bank[],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

/** Unpaginated list used to populate select inputs. */
export async function listActiveBanks(): Promise<Bank[]> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return sortRows(
      demoRows.filter((bank) => bank.status === "ACTIVE"),
      (b) => b.name,
      "asc",
    );
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("status", "ACTIVE")
    .order("name", { ascending: true });

  if (error) throw fromDatabaseError(error, "Listing banks");
  return (data ?? []) as Bank[];
}

export async function getBank(id: string): Promise<Bank> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const bank = demoRows.find((row) => row.id === id);
    if (!bank) throw notFound("Bank");
    return bank;
  }

  const { data, error } = await supabase.from(TABLE).select("*").eq("id", id).maybeSingle();
  if (error) throw fromDatabaseError(error, "Loading bank");
  if (!data) throw notFound("Bank");
  return data as Bank;
}

export async function createBank(input: BankInput): Promise<Bank> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const timestamp = nowIso();
    const bank: Bank = { id: newId(), ...input, created_at: timestamp, updated_at: timestamp };
    demoRows.unshift(bank);
    return bank;
  }

  const { data, error } = await supabase.from(TABLE).insert(input).select("*").single();
  if (error) throw fromDatabaseError(error, "Creating bank");
  return data as Bank;
}

export async function updateBank(
  id: string,
  input: Partial<BankInput>,
): Promise<Bank> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const index = demoRows.findIndex((row) => row.id === id);
    if (index === -1) throw notFound("Bank");
    const updated: Bank = { ...(demoRows[index] as Bank), ...input, updated_at: nowIso() };
    demoRows[index] = updated;
    return updated;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Updating bank");
  if (!data) throw notFound("Bank");
  return data as Bank;
}
