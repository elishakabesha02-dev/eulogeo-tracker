import { Slot } from "@/components/ui/slot";
import { cn } from "@/lib/utils/cn";
import type { ButtonHTMLAttributes, ReactNode } from "react";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "ghost"
  | "danger"
  | "outline";
export type ButtonSize = "sm" | "md" | "lg" | "icon";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-fg hover:bg-primary-hover disabled:hover:bg-primary",
  secondary:
    "bg-surface-muted text-fg border border-border-default hover:bg-bg-subtle",
  outline:
    "bg-transparent text-fg border border-border-strong hover:bg-surface-muted",
  ghost: "bg-transparent text-fg-muted hover:bg-surface-muted hover:text-fg",
  danger: "bg-danger text-white hover:opacity-90",
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-8 px-3 text-xs gap-1.5",
  md: "h-9.5 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-sm gap-2",
  icon: "h-9 w-9 justify-center",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Renders the child element instead of a <button>, keeping the styles. */
  asChild?: boolean;
  loading?: boolean;
  children?: ReactNode;
}

export function Button({
  className,
  variant = "primary",
  size = "md",
  asChild = false,
  loading = false,
  disabled,
  children,
  ...props
}: ButtonProps) {
  const Component = asChild ? Slot : "button";

  // `Slot` clones a single child, so the spinner must not be introduced as a
  // sibling. `asChild` buttons are links and never carry a loading state.
  const content = asChild ? (
    children
  ) : (
    <>
      {loading ? (
        <span
          className="size-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
          aria-hidden="true"
        />
      ) : null}
      {children}
    </>
  );

  return (
    <Component
      className={cn(
        "inline-flex items-center rounded-lg font-medium whitespace-nowrap transition-colors",
        "disabled:pointer-events-none disabled:opacity-50",
        "[&_svg]:size-4 [&_svg]:shrink-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      disabled={asChild ? undefined : disabled || loading}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </Component>
  );
}
