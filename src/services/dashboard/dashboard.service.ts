import "server-only";

import { requirePermission } from "@/lib/auth/session";
import { countAtms } from "@/lib/database/repositories/atms";
import { listDailyOperations } from "@/lib/database/repositories/operations";
import { summariseReconciliations } from "@/lib/database/repositories/reconciliations";
import { todayBusinessDate } from "@/lib/utils/dates";
import type { DailyOperationWithRelations, DashboardMetrics } from "@/types/domain";

/**
 * Dashboard aggregation. Counts come from the same repositories the detail pages
 * use, so a tile and the table behind it can never disagree.
 */

export interface DashboardData {
  metrics: DashboardMetrics;
  todaysOperations: DailyOperationWithRelations[];
  businessDate: string;
}

export async function getDashboardData(): Promise<DashboardData> {
  await requirePermission("operations:read");

  const businessDate = todayBusinessDate();

  const [atmCounts, reconciliation, operations] = await Promise.all([
    countAtms(),
    summariseReconciliations(businessDate),
    listDailyOperations({ date: businessDate, page: 1, pageSize: 8 }),
  ]);

  return {
    businessDate,
    metrics: {
      totalAtms: atmCounts.total,
      activeAtms: atmCounts.active,
      reconciled: reconciliation.reconciled,
      pending: reconciliation.pending,
      variances: reconciliation.variances,
      escalated: reconciliation.escalated,
    },
    todaysOperations: operations.data,
  };
}
