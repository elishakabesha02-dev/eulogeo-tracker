import "server-only";

import { requirePermission } from "@/lib/auth/session";
import {
  listAuditLogs,
  listRecentAudit,
  type AuditQuery,
} from "@/lib/database/repositories/audit";
import { humanizeEnum } from "@/lib/utils/format";
import type { Paginated } from "@/types/common";
import type { ActivityItem, AuditLog } from "@/types/domain";

export async function getAuditLogList(
  query: AuditQuery,
): Promise<Paginated<AuditLog>> {
  await requirePermission("audit:read");
  return listAuditLogs(query);
}

/**
 * The dashboard's activity feed is a projection of the audit trail rather than a
 * second write path, so nothing can appear in the feed without being auditable.
 */
export async function getRecentActivity(limit = 6): Promise<ActivityItem[]> {
  const logs = await listRecentAudit(limit);

  return logs.map((log) => ({
    id: log.id,
    action: log.action,
    entity: log.entity,
    summary: summarise(log),
    actor: log.actor_email ?? "System",
    at: log.created_at,
  }));
}

function summarise(log: AuditLog): string {
  const metadata = log.metadata ?? {};
  const label =
    typeof metadata.atm_code === "string"
      ? metadata.atm_code
      : typeof metadata.file_name === "string"
        ? metadata.file_name
        : typeof metadata.reference === "string"
          ? metadata.reference
          : typeof metadata.name === "string"
            ? metadata.name
            : null;

  const action = humanizeEnum(log.action);
  return label ? `${action} — ${label}` : action;
}
