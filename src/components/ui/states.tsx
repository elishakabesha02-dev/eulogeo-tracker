import { cn } from "@/lib/utils/cn";
import { CircleAlert, Inbox, type LucideIcon } from "lucide-react";
import type { ReactNode } from "react";

/* -------------------------------------------------------------------------- */
/*  Loading                                                                   */
/* -------------------------------------------------------------------------- */

export function Spinner({ className }: { className?: string }) {
  return (
    <span
      role="status"
      aria-label="Loading"
      className={cn(
        "inline-block size-4 animate-spin rounded-full border-2 border-current border-t-transparent",
        className,
      )}
    />
  );
}

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-surface-muted", className)}
      aria-hidden="true"
    />
  );
}

/** Table-shaped placeholder used by route-level `loading.tsx` files. */
export function TableSkeleton({ rows = 6 }: { rows?: number }) {
  return (
    <div className="space-y-2 p-5">
      <Skeleton className="h-8 w-full" />
      {Array.from({ length: rows }, (_, index) => (
        <Skeleton key={index} className="h-11 w-full" />
      ))}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Empty                                                                     */
/* -------------------------------------------------------------------------- */

export interface EmptyStateProps {
  title: string;
  description?: string;
  icon?: LucideIcon;
  action?: ReactNode;
  className?: string;
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-surface-muted text-fg-subtle">
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        {description ? (
          <p className="mx-auto max-w-sm text-xs text-fg-muted">{description}</p>
        ) : null}
      </div>
      {action}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/*  Error                                                                     */
/* -------------------------------------------------------------------------- */

export interface ErrorStateProps {
  title?: string;
  description?: string;
  action?: ReactNode;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "The data could not be loaded. Try again in a moment.",
  action,
  className,
}: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={cn(
        "flex flex-col items-center justify-center gap-3 px-6 py-14 text-center",
        className,
      )}
    >
      <span className="flex size-11 items-center justify-center rounded-full bg-danger-subtle text-danger">
        <CircleAlert className="size-5" aria-hidden="true" />
      </span>
      <div className="space-y-1">
        <p className="text-sm font-medium text-fg">{title}</p>
        <p className="mx-auto max-w-sm text-xs text-fg-muted">{description}</p>
      </div>
      {action}
    </div>
  );
}
