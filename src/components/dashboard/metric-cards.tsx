import {
  Banknote,
  CircleCheck,
  Clock,
  PlugZap,
  TrendingUp,
  TriangleAlert,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";

import { cn } from "@/lib/utils/cn";
import { formatNumber } from "@/lib/utils/format";
import type { DashboardMetrics } from "@/types/domain";

interface MetricDefinition {
  key: keyof DashboardMetrics;
  label: string;
  icon: LucideIcon;
  tone: "neutral" | "success" | "warning" | "danger" | "info";
  href: string;
  hint: string;
}

const METRICS: MetricDefinition[] = [
  {
    key: "totalAtms",
    label: "Total ATMs",
    icon: Banknote,
    tone: "neutral",
    href: "/operations/atms",
    hint: "Across all banks",
  },
  {
    key: "activeAtms",
    label: "Active ATMs",
    icon: PlugZap,
    tone: "success",
    href: "/operations/atms?status=ACTIVE",
    hint: "Currently in service",
  },
  {
    key: "reconciled",
    label: "Reconciled",
    icon: CircleCheck,
    tone: "success",
    href: "/operations/reconciliation?status=RECONCILED",
    hint: "Closed for today",
  },
  {
    key: "pending",
    label: "Pending",
    icon: Clock,
    tone: "info",
    href: "/operations/reconciliation?status=PENDING",
    hint: "Awaiting reconciliation",
  },
  {
    key: "variances",
    label: "Variances",
    icon: TrendingUp,
    tone: "warning",
    href: "/operations/exceptions",
    hint: "Difference detected",
  },
  {
    key: "escalated",
    label: "Escalated",
    icon: TriangleAlert,
    tone: "danger",
    href: "/operations/exceptions?status=ESCALATED",
    hint: "Needs supervisor action",
  },
];

const TONE_STYLES = {
  neutral: "bg-neutral-subtle text-fg-muted",
  success: "bg-success-subtle text-success",
  warning: "bg-warning-subtle text-warning",
  danger: "bg-danger-subtle text-danger",
  info: "bg-info-subtle text-info",
} as const;

export function MetricCards({ metrics }: { metrics: DashboardMetrics }) {
  return (
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
      {METRICS.map((metric) => {
        const Icon = metric.icon;
        return (
          <Link
            key={metric.key}
            href={metric.href}
            className="group rounded-card border border-border-default bg-surface p-4 transition-colors elevated hover:border-border-strong"
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-[0.6875rem] font-semibold tracking-wider text-fg-subtle uppercase">
                {metric.label}
              </p>
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-lg",
                  TONE_STYLES[metric.tone],
                )}
              >
                <Icon className="size-3.5" aria-hidden="true" />
              </span>
            </div>
            <p className="mt-2 text-2xl font-semibold text-fg tabular">
              {formatNumber(metrics[metric.key])}
            </p>
            <p className="mt-0.5 text-xs text-fg-subtle">{metric.hint}</p>
          </Link>
        );
      })}
    </div>
  );
}
