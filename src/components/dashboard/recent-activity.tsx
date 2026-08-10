import {
  Banknote,
  Building2,
  FileBarChart,
  FileText,
  LogIn,
  Scale,
  Settings,
  TriangleAlert,
  Users,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/states";
import { formatRelativeTime } from "@/lib/utils/format";
import type { ActivityItem, AuditEntity } from "@/types/domain";

const ICONS: Record<AuditEntity, LucideIcon> = {
  auth: LogIn,
  atm: Banknote,
  bank: Building2,
  branch: Building2,
  custodian: Users,
  engineer: Users,
  daily_operation: Scale,
  reconciliation: Scale,
  exception: TriangleAlert,
  document: FileText,
  report: FileBarChart,
  settings: Settings,
};

export function RecentActivity({ items }: { items: ActivityItem[] }) {
  return (
    <Card className="flex flex-col">
      <CardHeader
        title="Recent activity"
        description="Projected from the audit log"
      />

      {items.length === 0 ? (
        <EmptyState
          title="No recorded activity yet"
          description="Actions taken in the system will appear here."
        />
      ) : (
        <ul className="divide-y divide-border-default">
          {items.map((item) => {
            const Icon = ICONS[item.entity] ?? FileText;
            return (
              <li key={item.id} className="flex items-start gap-3 px-5 py-3">
                <span className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-lg bg-surface-muted text-fg-subtle">
                  <Icon className="size-3.5" aria-hidden="true" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm text-fg">{item.summary}</p>
                  <p className="mt-0.5 truncate text-xs text-fg-subtle">
                    {item.actor} · {formatRelativeTime(item.at)}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-auto border-t border-border-default px-5 py-3">
        <Link
          href="/system/audit-logs"
          className="text-xs font-medium text-primary hover:underline"
        >
          View full audit log
        </Link>
      </div>
    </Card>
  );
}
