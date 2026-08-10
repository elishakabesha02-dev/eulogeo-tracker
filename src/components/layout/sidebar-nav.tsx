"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { NAVIGATION } from "@/config/navigation";
import { cn } from "@/lib/utils/cn";

export interface SidebarNavProps {
  /**
   * Hrefs this user may see. Computed on the server from their role — the
   * navigation config itself stays on the client so icon components never have
   * to cross the server/client boundary.
   */
  allowedHrefs: string[];
  onNavigate?: () => void;
}

export function SidebarNav({ allowedHrefs, onNavigate }: SidebarNavProps) {
  const pathname = usePathname();
  const allowed = new Set(allowedHrefs);

  return (
    <nav aria-label="Main" className="flex flex-col gap-5 px-3 py-4">
      {NAVIGATION.map((section, index) => {
        const items = section.items.filter((item) => allowed.has(item.href));
        if (items.length === 0) return null;

        return (
          <div key={section.title ?? `section-${index}`} className="space-y-1">
            {section.title ? (
              <p className="px-3 pb-1 text-[0.6875rem] font-semibold tracking-wider text-fg-subtle uppercase">
                {section.title}
              </p>
            ) : null}

            {items.map((item) => {
              const Icon = item.icon;
              // Exact match for the dashboard, prefix match for module roots so
              // detail pages keep their parent highlighted.
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard" && pathname.startsWith(`${item.href}/`));

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    active
                      ? "bg-primary-subtle text-primary"
                      : "text-fg-muted hover:bg-surface-muted hover:text-fg",
                  )}
                >
                  <Icon
                    className={cn(
                      "size-4 shrink-0",
                      active ? "text-primary" : "text-fg-subtle group-hover:text-fg-muted",
                    )}
                    aria-hidden="true"
                  />
                  <span className="truncate">{item.label}</span>
                </Link>
              );
            })}
          </div>
        );
      })}
    </nav>
  );
}
