import { cn } from "@/lib/utils/cn";
import { humanizeEnum } from "@/lib/utils/format";
import type { HTMLAttributes } from "react";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-neutral-subtle text-fg-muted ring-neutral/20",
  primary: "bg-primary-subtle text-primary ring-primary/25",
  success: "bg-success-subtle text-success ring-success/25",
  warning: "bg-warning-subtle text-warning ring-warning/25",
  danger: "bg-danger-subtle text-danger ring-danger/25",
  info: "bg-info-subtle text-info ring-info/25",
};

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: BadgeTone;
  /** Adds a filled dot — used for statuses that need to read at a glance. */
  dot?: boolean;
}

export function Badge({
  tone = "neutral",
  dot = false,
  className,
  children,
  ...props
}: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset",
        TONES[tone],
        className,
      )}
      {...props}
    >
      {dot ? (
        <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/*  Status mapping                                                            */
/* -------------------------------------------------------------------------- */

/**
 * One place decides what colour a status is. Every table, tile and detail page
 * reads from here, so "VARIANCE" is amber everywhere or nowhere.
 */
const STATUS_TONES: Record<string, BadgeTone> = {
  // Generic lifecycle
  ACTIVE: "success",
  INACTIVE: "neutral",
  MAINTENANCE: "warning",
  DECOMMISSIONED: "neutral",

  // Operational
  PENDING: "neutral",
  PROCESSING: "info",
  IN_PROGRESS: "info",
  COMPLETED: "success",
  EXCEPTION: "danger",

  // Reconciliation
  RECONCILED: "success",
  VARIANCE: "warning",
  ESCALATED: "danger",

  // Exceptions
  OPEN: "warning",
  INVESTIGATING: "info",
  RESOLVED: "success",
  CLOSED: "neutral",

  // Priority
  LOW: "neutral",
  MEDIUM: "info",
  HIGH: "warning",
  CRITICAL: "danger",

  // Documents & reports
  UPLOADED: "info",
  QUEUED: "neutral",
  PROCESSED: "success",
  READY: "success",
  GENERATING: "info",
  FAILED: "danger",

  // Notifications
  INFO: "info",
  SUCCESS: "success",
  WARNING: "warning",
  ERROR: "danger",
};

export function toneForStatus(status: string): BadgeTone {
  return STATUS_TONES[status] ?? "neutral";
}

export function StatusBadge({
  status,
  className,
}: {
  status: string;
  className?: string;
}) {
  return (
    <Badge tone={toneForStatus(status)} dot className={className}>
      {humanizeEnum(status)}
    </Badge>
  );
}
