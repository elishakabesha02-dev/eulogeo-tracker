import "server-only";

import { requirePermission } from "@/lib/auth/session";
import {
  countOperationsByReconciliationStatus,
  listDailyOperations,
  type DailyOperationQuery,
} from "@/lib/database/repositories/operations";
import type { Paginated } from "@/types/common";
import type { DailyOperationWithRelations, ReconciliationStatus } from "@/types/domain";

export async function getDailyOperations(
  query: DailyOperationQuery,
): Promise<Paginated<DailyOperationWithRelations>> {
  await requirePermission("operations:read");
  return listDailyOperations(query);
}

export async function getOperationStatusCounts(
  date: string,
): Promise<Record<ReconciliationStatus, number>> {
  await requirePermission("operations:read");
  return countOperationsByReconciliationStatus(date);
}
