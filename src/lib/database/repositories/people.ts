import "server-only";

import {
  demoAtms,
  demoBanks,
  demoCustodians,
  demoEngineers,
} from "@/lib/database/demo/dataset";
import { matchesSearch, newId, nowIso, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError, notFound } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ActiveStatus, ListQuery, Paginated } from "@/types/common";
import type { Custodian, Engineer } from "@/types/domain";

/**
 * Custodians and engineers share a shape and a lifecycle, so they share an
 * adapter. Only the fields that genuinely differ are handled per-entity.
 *
 * Neither record carries sensitive personal data — name, staff number and a
 * work contact number are the whole surface.
 */

export interface PersonListQuery extends ListQuery {
  status?: ActiveStatus;
}

/** The assigned-ATM column is derived from `atms`, not stored on the person. */
export interface WithAssignedAtms {
  assigned_atm_codes: string[];
}

export type CustodianRow = Custodian & WithAssignedAtms & { bank_name: string | null };
export type EngineerRow = Engineer & WithAssignedAtms;

export interface CustodianInput {
  full_name: string;
  employee_id: string;
  phone: string | null;
  status: ActiveStatus;
  bank_id: string | null;
}

export interface EngineerInput {
  full_name: string;
  employee_id: string;
  phone: string | null;
  status: ActiveStatus;
  specialization: string | null;
}

const demoCustodianRows: Custodian[] = [...demoCustodians];
const demoEngineerRows: Engineer[] = [...demoEngineers];

function demoAtmCodesFor(key: "custodian_id" | "engineer_id", id: string): string[] {
  return demoAtms
    .filter((atm) => atm[key] === id && atm.status !== "DECOMMISSIONED")
    .map((atm) => atm.atm_code);
}

/* -------------------------------------------------------------------------- */
/*  Custodians                                                                */
/* -------------------------------------------------------------------------- */

interface EmbeddedCustodian extends Custodian {
  bank?: { name: string } | null;
  atms?: Array<{ atm_code: string }> | null;
}

export async function listCustodians(
  query: PersonListQuery = {},
): Promise<Paginated<CustodianRow>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows: CustodianRow[] = demoCustodianRows.map((person) => ({
      ...person,
      bank_name: demoBanks.find((bank) => bank.id === person.bank_id)?.name ?? null,
      assigned_atm_codes: demoAtmCodesFor("custodian_id", person.id),
    }));

    const filtered = rows
      .filter((person) => (query.status ? person.status === query.status : true))
      .filter((person) =>
        matchesSearch(person, query.search, [
          (p) => p.full_name,
          (p) => p.employee_id,
          (p) => p.bank_name,
        ]),
      );

    return pageOf(sortRows(filtered, (p) => p.full_name, "asc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from("custodians")
    .select("*, bank:banks(name), atms(atm_code)", { count: "exact" })
    .order("full_name", { ascending: true })
    .range(from, from + pageSize - 1);

  if (query.status) builder = builder.eq("status", query.status);
  if (query.search?.trim()) {
    const term = query.search.trim();
    builder = builder.or(`full_name.ilike.%${term}%,employee_id.ilike.%${term}%`);
  }

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing custodians");

  const total = count ?? 0;
  return {
    data: ((data ?? []) as unknown as EmbeddedCustodian[]).map(
      ({ bank, atms, ...rest }) => ({
        ...rest,
        bank_name: bank?.name ?? null,
        assigned_atm_codes: (atms ?? []).map((atm) => atm.atm_code),
      }),
    ),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listActiveCustodians(): Promise<Custodian[]> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return sortRows(
      demoCustodianRows.filter((person) => person.status === "ACTIVE"),
      (p) => p.full_name,
      "asc",
    );
  }

  const { data, error } = await supabase
    .from("custodians")
    .select("*")
    .eq("status", "ACTIVE")
    .order("full_name", { ascending: true });

  if (error) throw fromDatabaseError(error, "Listing custodians");
  return (data ?? []) as Custodian[];
}

export async function createCustodian(input: CustodianInput): Promise<Custodian> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const timestamp = nowIso();
    const person: Custodian = { id: newId(), ...input, created_at: timestamp, updated_at: timestamp };
    demoCustodianRows.unshift(person);
    return person;
  }

  const { data, error } = await supabase.from("custodians").insert(input).select("*").single();
  if (error) throw fromDatabaseError(error, "Creating custodian");
  return data as Custodian;
}

export async function updateCustodian(
  id: string,
  input: Partial<CustodianInput>,
): Promise<Custodian> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const index = demoCustodianRows.findIndex((row) => row.id === id);
    if (index === -1) throw notFound("Custodian");
    const updated: Custodian = {
      ...(demoCustodianRows[index] as Custodian),
      ...input,
      updated_at: nowIso(),
    };
    demoCustodianRows[index] = updated;
    return updated;
  }

  const { data, error } = await supabase
    .from("custodians")
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Updating custodian");
  if (!data) throw notFound("Custodian");
  return data as Custodian;
}

/* -------------------------------------------------------------------------- */
/*  Engineers                                                                 */
/* -------------------------------------------------------------------------- */

interface EmbeddedEngineer extends Engineer {
  atms?: Array<{ atm_code: string }> | null;
}

export async function listEngineers(
  query: PersonListQuery = {},
): Promise<Paginated<EngineerRow>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows: EngineerRow[] = demoEngineerRows.map((person) => ({
      ...person,
      assigned_atm_codes: demoAtmCodesFor("engineer_id", person.id),
    }));

    const filtered = rows
      .filter((person) => (query.status ? person.status === query.status : true))
      .filter((person) =>
        matchesSearch(person, query.search, [
          (p) => p.full_name,
          (p) => p.employee_id,
          (p) => p.specialization,
        ]),
      );

    return pageOf(sortRows(filtered, (p) => p.full_name, "asc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 10);
  const from = (page - 1) * pageSize;

  let builder = supabase
    .from("engineers")
    .select("*, atms(atm_code)", { count: "exact" })
    .order("full_name", { ascending: true })
    .range(from, from + pageSize - 1);

  if (query.status) builder = builder.eq("status", query.status);
  if (query.search?.trim()) {
    const term = query.search.trim();
    builder = builder.or(`full_name.ilike.%${term}%,employee_id.ilike.%${term}%`);
  }

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing engineers");

  const total = count ?? 0;
  return {
    data: ((data ?? []) as unknown as EmbeddedEngineer[]).map(({ atms, ...rest }) => ({
      ...rest,
      assigned_atm_codes: (atms ?? []).map((atm) => atm.atm_code),
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function listActiveEngineers(): Promise<Engineer[]> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    return sortRows(
      demoEngineerRows.filter((person) => person.status === "ACTIVE"),
      (p) => p.full_name,
      "asc",
    );
  }

  const { data, error } = await supabase
    .from("engineers")
    .select("*")
    .eq("status", "ACTIVE")
    .order("full_name", { ascending: true });

  if (error) throw fromDatabaseError(error, "Listing engineers");
  return (data ?? []) as Engineer[];
}

export async function createEngineer(input: EngineerInput): Promise<Engineer> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const timestamp = nowIso();
    const person: Engineer = { id: newId(), ...input, created_at: timestamp, updated_at: timestamp };
    demoEngineerRows.unshift(person);
    return person;
  }

  const { data, error } = await supabase.from("engineers").insert(input).select("*").single();
  if (error) throw fromDatabaseError(error, "Creating engineer");
  return data as Engineer;
}

export async function updateEngineer(
  id: string,
  input: Partial<EngineerInput>,
): Promise<Engineer> {
  const supabase = await getServerSupabase();
  if (!supabase) {
    const index = demoEngineerRows.findIndex((row) => row.id === id);
    if (index === -1) throw notFound("Engineer");
    const updated: Engineer = {
      ...(demoEngineerRows[index] as Engineer),
      ...input,
      updated_at: nowIso(),
    };
    demoEngineerRows[index] = updated;
    return updated;
  }

  const { data, error } = await supabase
    .from("engineers")
    .update({ ...input, updated_at: nowIso() })
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Updating engineer");
  if (!data) throw notFound("Engineer");
  return data as Engineer;
}
