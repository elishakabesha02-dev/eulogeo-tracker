import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes, ReactNode } from "react";

export function Card({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "rounded-card border border-border-default bg-surface elevated",
        className,
      )}
      {...props}
    />
  );
}

export interface CardHeaderProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "title"> {
  title: ReactNode;
  description?: ReactNode;
  action?: ReactNode;
}

export function CardHeader({
  title,
  description,
  action,
  className,
  ...props
}: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-start justify-between gap-3 border-b border-border-default px-5 py-4",
        className,
      )}
      {...props}
    >
      <div className="min-w-0">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description ? (
          <p className="mt-0.5 text-xs text-fg-muted">{description}</p>
        ) : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}

export function CardBody({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-5", className)} {...props} />;
}

export function CardFooter({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3 border-t border-border-default px-5 py-3",
        className,
      )}
      {...props}
    />
  );
}
