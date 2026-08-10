"use client";

import { Monitor, Moon, Sun } from "lucide-react";

import { useTheme, type ThemePreference } from "@/components/layout/theme-provider";
import { cn } from "@/lib/utils/cn";

const OPTIONS: Array<{ value: ThemePreference; label: string; icon: typeof Sun }> = [
  { value: "light", label: "Light", icon: Sun },
  { value: "system", label: "System", icon: Monitor },
  { value: "dark", label: "Dark", icon: Moon },
];

/** Three-state segmented control: light, follow system, dark. */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="Colour theme"
      className="flex items-center gap-0.5 rounded-lg border border-border-default bg-surface-muted p-0.5"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = preference === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            title={label}
            onClick={() => setPreference(value)}
            className={cn(
              "rounded-md p-1.5 transition-colors",
              selected
                ? "bg-surface text-fg elevated"
                : "text-fg-subtle hover:text-fg",
            )}
          >
            <Icon className="size-3.5" aria-hidden="true" />
          </button>
        );
      })}
    </div>
  );
}
