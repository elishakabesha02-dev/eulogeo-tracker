import { Children, cloneElement, isValidElement, type ReactElement, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

interface SlotProps {
  children?: ReactNode;
  className?: string;
  [key: string]: unknown;
}

/**
 * Minimal `asChild` implementation: merges the slot's props onto its single
 * child instead of rendering a wrapper element. Written by hand rather than
 * pulled from a component library — it is twenty lines and this is the only
 * primitive we need from one.
 */
export function Slot({ children, className, ...props }: SlotProps) {
  const child = Children.only(children);

  if (!isValidElement(child)) return null;

  const childProps = child.props as { className?: string };

  return cloneElement(child as ReactElement<Record<string, unknown>>, {
    ...props,
    className: cn(className, childProps.className),
  });
}
