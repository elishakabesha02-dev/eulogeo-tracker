import { cn } from "@/lib/utils/cn";
import type { ReactNode } from "react";

export interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: ReactNode;
  /** Rendered under the title — used for the "placeholder module" notice. */
  notice?: ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  actions,
  notice,
  className,
}: PageHeaderProps) {
  return (
    <div className={cn("mb-5", className)}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold tracking-tight text-fg">{title}</h2>
          {description ? (
            <p className="mt-1 max-w-2xl text-sm text-fg-muted">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap items-center gap-2">{actions}</div>
        ) : null}
      </div>
      {notice ? <div className="mt-3">{notice}</div> : null}
    </div>
  );
}

export interface PhaseNoticeProps {
  children: ReactNode;
}

/**
 * Standard banner for modules that are structure-only in this phase. Being
 * explicit beats a page that looks finished but does nothing.
 */
export function PhaseNotice({ children }: PhaseNoticeProps) {
  return (
    <div className="flex gap-2.5 rounded-lg border border-warning/25 bg-warning-subtle px-4 py-3">
      <span
        className="mt-1.5 size-1.5 shrink-0 rounded-full bg-warning"
        aria-hidden="true"
      />
      <p className="text-xs leading-relaxed text-fg">{children}</p>
    </div>
  );
}
