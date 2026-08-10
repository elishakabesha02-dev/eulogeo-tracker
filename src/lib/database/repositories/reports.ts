import "server-only";

import { demoProfiles, demoReports } from "@/lib/database/demo/dataset";
import { matchesSearch, pageOf, sortRows } from "@/lib/database/demo/query";
import { fromDatabaseError } from "@/lib/database/errors";
import { getServerSupabase } from "@/lib/supabase/server";
import type { ListQuery, Paginated } from "@/types/common";
import type { Report, ReportType, ReportWithRelations } from "@/types/domain";

const TABLE = "reports";

const SELECT_WITH_RELATIONS = `
  *,
  creator:profiles!reports_created_by_fkey(full_name)
`;

export interface ReportQuery extends ListQuery {
  type?: ReportType;
}

function withDemoRelations(row: Report): ReportWithRelations {
  return {
    ...row,
    created_by_name:
      demoProfiles.find((profile) => profile.user_id === row.created_by)?.full_name ?? null,
  };
}

interface EmbeddedRow extends Report {
  creator?: { full_name: string } | null;
}

export async function listReports(
  query: ReportQuery = {},
): Promise<Paginated<ReportWithRelations>> {
  const supabase = await getServerSupabase();

  if (!supabase) {
    const rows = demoReports
      .map(withDemoRelations)
      .filter((row) => (query.type ? row.type === query.type : true))
      .filter((row) => matchesSearch(row, query.search, [(r) => r.name]));
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

  if (query.type) builder = builder.eq("type", query.type);

  const { data, error, count } = await builder;
  if (error) throw fromDatabaseError(error, "Listing reports");

  const total = count ?? 0;
  return {
    data: ((data ?? []) as unknown as EmbeddedRow[]).map(({ creator, ...rest }) => ({
      ...rest,
      created_by_name: creator?.full_name ?? null,
    })),
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}
