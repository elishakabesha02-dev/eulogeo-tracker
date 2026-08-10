import "server-only";

import { requirePermission } from "@/lib/auth/session";
import { notImplemented } from "@/lib/database/errors";
import {
  getReconciliation,
  listReconciliations,
  summariseReconciliations,
  type ReconciliationQuery,
  type ReconciliationSummary,
} from "@/lib/database/repositories/reconciliations";
import type { Paginated } from "@/types/common";
import type { ReconciliationWithRelations } from "@/types/domain";

/**
 * Reconciliation service — read paths only.
 *
 * The reconciliation ENGINE is deliberately absent. When it lands it will be a
 * separate, pure module (`services/reconciliation/engine`) with no I/O, so the
 * arithmetic is unit-testable and deterministic. This service will call it and
 * persist the result; the model layer will never compute a financial figure.
 */

export async function getReconciliationList(
  query: ReconciliationQuery,
): Promise<Paginated<ReconciliationWithRelations>> {
  await requirePermission("reconciliation:read");
  return listReconciliations(query);
}

export async function getReconciliationDetail(
  id: string,
): Promise<ReconciliationWithRelations> {
  await requirePermission("reconciliation:read");
  return getReconciliation(id);
}

export async function getReconciliationSummary(
  date: string,
): Promise<ReconciliationSummary> {
  await requirePermission("reconciliation:read");
  return summariseReconciliations(date);
}

/**
 * Placeholder for the run entry point. It authorizes correctly and then refuses,
 * rather than pretending to reconcile — a fake result here would be worse than
 * no result at all.
 */
export async function startReconciliation(_id: string): Promise<never> {
  await requirePermission("reconciliation:write");
  throw notImplemented("The reconciliation engine");
}
