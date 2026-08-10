import "server-only";

import { demoProfiles } from "@/lib/database/demo/dataset";
import { pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type { Profile } from "@/types/auth";

const TABLE = "profiles";

export async function getProfileByUserId(userId: string): Promise<Profile | null> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return demoProfiles.find((profile) => profile.user_id === userId) ?? null;
  }

  const { data, error } = await supabase
    .from(TABLE)
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw fromDatabaseError(error, "Loading profile");
  return (data as Profile | null) ?? null;
}

export async function listProfiles(query: ListQuery = {}): Promise<Paginated<Profile>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    return pageOf(sortRows(demoProfiles, (p) => p.full_name, "asc"), query);
  }

  const page = Math.max(1, query.page ?? 1);
  const pageSize = Math.max(1, query.pageSize ?? 25);
  const from = (page - 1) * pageSize;

  const { data, error, count } = await supabase
    .from(TABLE)
    .select("*", { count: "exact" })
    .order("full_name", { ascending: true })
    .range(from, from + pageSize - 1);

  if (error) throw fromDatabaseError(error, "Listing users");

  const total = count ?? 0;
  return {
    data: (data ?? []) as Profile[],
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
