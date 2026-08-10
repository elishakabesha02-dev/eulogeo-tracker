"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

export interface DropdownProps {
  trigger: ReactNode;
  children: ReactNode;
  align?: "start" | "end";
  className?: string;
  /** Accessible label for the trigger when it renders an icon only. */
  label?: string;
}

/**
 * Click-to-open menu. Closes on outside click, on Escape, and after any item
 * inside is activated — so callers do not have to wire up dismissal themselves.
 */
export function Dropdown({
  trigger,
  children,
  align = "end",
  className,
  label,
}: DropdownProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;

    function onPointerDown(event: MouseEvent) {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    }
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        onClick={() => setOpen((value) => !value)}
        className="flex items-center rounded-lg"
      >
        {trigger}
      </button>

      {open ? (
        <div
          role="menu"
          onClick={() => setOpen(false)}
          className={cn(
            "absolute z-40 mt-1.5 min-w-48 overflow-hidden rounded-xl border border-border-default bg-surface py-1 elevated-lg",
            align === "end" ? "right-0" : "left-0",
          )}
        >
          {children}
        </div>
      ) : null}
    </div>
  );
}

export interface DropdownItemProps {
  onSelect?: () => void;
  href?: string;
  children: ReactNode;
  destructive?: boolean;
  disabled?: boolean;
}

export function DropdownItem({
  onSelect,
  href,
  children,
  destructive = false,
  disabled = false,
}: DropdownItemProps) {
  const className = cn(
    "flex w-full items-center gap-2 px-3 py-2 text-left text-sm transition-colors",
    "[&_svg]:size-4 [&_svg]:shrink-0 [&_svg]:text-fg-subtle",
    destructive ? "text-danger hover:bg-danger-subtle" : "text-fg hover:bg-surface-muted",
    disabled && "pointer-events-none opacity-50",
  );

  if (href) {
    return (
      <a role="menuitem" href={href} className={className}>
        {children}
      </a>
    );
  }

  return (
    <button
      type="button"
      role="menuitem"
      onClick={onSelect}
      disabled={disabled}
      className={className}
    >
      {children}
    </button>
  );
}

export function DropdownSeparator() {
  return <div className="my-1 h-px bg-border-default" role="separator" />;
}

export function DropdownLabel({ children }: { children: ReactNode }) {
  return (
    <p className="px-3 py-1.5 text-xs font-semibold tracking-wide text-fg-subtle uppercase">
      {children}
    </p>
  );
}
