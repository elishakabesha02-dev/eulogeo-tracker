import { cn } from "@/lib/utils/cn";
import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";

/**
 * Data table primitives. The wrapper owns horizontal scrolling so a wide table
 * never forces the page body to scroll sideways on mobile.
 */
export function TableWrapper({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("w-full overflow-x-auto", className)} {...props} />;
}

export function Table({ className, ...props }: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full min-w-[44rem] border-collapse text-sm", className)}
      {...props}
    />
  );
}

export function THead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-border-default bg-surface-muted", className)}
      {...props}
    />
  );
}

export function TBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={cn("divide-y divide-border-default", className)} {...props} />
  );
}

export function Tr({ className, ...props }: HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr
      className={cn("transition-colors hover:bg-surface-muted/60", className)}
      {...props}
    />
  );
}

export function Th({ className, ...props }: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "px-4 py-2.5 text-left text-xs font-semibold tracking-wide text-fg-muted uppercase whitespace-nowrap",
        className,
      )}
      {...props}
    />
  );
}

export function Td({ className, ...props }: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 align-middle text-fg", className)} {...props} />
  );
}
