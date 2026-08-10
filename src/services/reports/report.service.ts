import "server-only";

import { requirePermission } from "@/lib/auth/session";
import { notImplemented } from "@/lib/database/errors";
import { listReports, type ReportQuery } from "@/lib/database/repositories/reports";
import type { Paginated } from "@/types/common";
import type { ReportWithRelations } from "@/types/domain";

export async function getReportList(
  query: ReportQuery,
): Promise<Paginated<ReportWithRelations>> {
  await requirePermission("report:read");
  return listReports(query);
}

/**
 * Placeholder. Report rendering (PDF/XLSX) arrives in a later phase and will run
 * as a background job so a large export never blocks a request.
 */
export async function requestReport(_input: unknown): Promise<never> {
  await requirePermission("report:write");
  throw notImplemented("Report generation");
}

export async function downloadReport(_id: string): Promise<never> {
  await requirePermission("report:read");
  throw notImplemented("Report downloads");
}
