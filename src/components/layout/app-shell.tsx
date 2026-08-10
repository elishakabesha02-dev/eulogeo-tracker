"use client";

import { Bell, LogOut, Menu, ShieldCheck, User, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

import { SidebarNav } from "@/components/layout/sidebar-nav";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dropdown,
  DropdownItem,
  DropdownLabel,
  DropdownSeparator,
} from "@/components/ui/dropdown";
import { APP_SHORT_NAME, APP_TAGLINE } from "@/config/app";
import { NAV_INDEX } from "@/config/navigation";
import { initialsOf } from "@/lib/utils/format";
import { ROLE_LABELS, type Role } from "@/types/auth";

export interface AppShellProps {
  children: ReactNode;
  allowedHrefs: string[];
  user: { name: string; email: string; role: Role };
  unreadNotifications: number;
  isDemo: boolean;
  signOut: () => Promise<void>;
}

/**
 * Application chrome: fixed sidebar on desktop, slide-over drawer on mobile,
 * and a sticky header. The only stateful part is drawer visibility — everything
 * else is server-rendered and passed in.
 */
export function AppShell({
  children,
  allowedHrefs,
  user,
  unreadNotifications,
  isDemo,
  signOut,
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const pathname = usePathname();

  // Close the drawer whenever the route changes, including on back/forward.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!drawerOpen) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") setDrawerOpen(false);
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [drawerOpen]);

  const pageTitle = NAV_INDEX[pathname]?.label ?? deriveTitle(pathname);

  return (
    <div className="min-h-dvh bg-bg">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-border-default bg-surface lg:flex">
        <Brand />
        <div className="min-h-0 flex-1 overflow-y-auto">
          <SidebarNav allowedHrefs={allowedHrefs} />
        </div>
        <SidebarFooter isDemo={isDemo} />
      </aside>

      {/* Mobile drawer */}
      {drawerOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <div
            className="absolute inset-0 bg-black/45"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <aside
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="relative flex h-full w-72 max-w-[85vw] flex-col border-r border-border-default bg-surface"
          >
            <div className="flex items-center justify-between border-b border-border-default pr-2">
              <Brand />
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close navigation"
              >
                <X />
              </Button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNav
                allowedHrefs={allowedHrefs}
                onNavigate={() => setDrawerOpen(false)}
              />
            </div>
            <SidebarFooter isDemo={isDemo} />
          </aside>
        </div>
      ) : null}

      {/* Main column */}
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border-default bg-surface/85 px-4 backdrop-blur-sm sm:px-6">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            onClick={() => setDrawerOpen(true)}
            aria-label="Open navigation"
          >
            <Menu />
          </Button>

          <h1 className="truncate text-sm font-semibold text-fg">{pageTitle}</h1>

          <div className="ml-auto flex items-center gap-2">
            {isDemo ? (
              <Badge tone="warning" className="hidden sm:inline-flex">
                Demo mode
              </Badge>
            ) : null}

            <ThemeToggle />

            <Link
              href="/system/notifications"
              aria-label={`Notifications${unreadNotifications > 0 ? `, ${unreadNotifications} unread` : ""}`}
              className="relative rounded-lg p-2 text-fg-muted transition-colors hover:bg-surface-muted hover:text-fg"
            >
              <Bell className="size-4" aria-hidden="true" />
              {unreadNotifications > 0 ? (
                <span className="absolute top-1 right-1 flex size-4 items-center justify-center rounded-full bg-danger text-[0.625rem] font-semibold text-white tabular">
                  {unreadNotifications > 9 ? "9+" : unreadNotifications}
                </span>
              ) : null}
            </Link>

            <Dropdown
              label="Account menu"
              trigger={
                <span className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-fg">
                  {initialsOf(user.name)}
                </span>
              }
            >
              <div className="px-3 py-2">
                <p className="truncate text-sm font-medium text-fg">{user.name}</p>
                <p className="truncate text-xs text-fg-muted">{user.email}</p>
                <Badge tone="primary" className="mt-1.5">
                  {ROLE_LABELS[user.role]}
                </Badge>
              </div>
              <DropdownSeparator />
              <DropdownLabel>Account</DropdownLabel>
              <DropdownItem href="/system/settings">
                <User />
                Profile &amp; settings
              </DropdownItem>
              <DropdownItem href="/system/audit-logs">
                <ShieldCheck />
                My activity
              </DropdownItem>
              <DropdownSeparator />
              <form action={signOut}>
                <button
                  type="submit"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-sm text-danger transition-colors hover:bg-danger-subtle [&_svg]:size-4"
                >
                  <LogOut />
                  Sign out
                </button>
              </form>
            </Dropdown>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[100rem] px-4 py-5 sm:px-6 sm:py-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function Brand() {
  return (
    <Link
      href="/dashboard"
      className="flex h-14 items-center gap-2.5 px-5 lg:border-b lg:border-border-default"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-xs font-bold text-primary-fg">
        {APP_SHORT_NAME}
      </span>
      <span className="min-w-0">
        <span className="block truncate text-sm leading-tight font-semibold text-fg">
          {APP_SHORT_NAME}
        </span>
        <span className="block truncate text-[0.6875rem] leading-tight text-fg-subtle">
          {APP_TAGLINE}
        </span>
      </span>
    </Link>
  );
}

function SidebarFooter({ isDemo }: { isDemo: boolean }) {
  return (
    <div className="border-t border-border-default px-4 py-3">
      <p className="text-[0.6875rem] leading-relaxed text-fg-subtle">
        {isDemo
          ? "Running on synthetic demo data. Changes are held in memory and reset when the server restarts."
          : "Foundation build — several modules are structure only."}
      </p>
    </div>
  );
}

/** Fallback page title for routes not listed in the navigation config. */
function deriveTitle(pathname: string): string {
  const parent = Object.entries(NAV_INDEX).find(
    ([href]) => href !== "/dashboard" && pathname.startsWith(`${href}/`),
  );
  if (parent) return parent[1].label;

  const segment = pathname.split("/").filter(Boolean).pop() ?? "";
  return segment
    ? segment.replace(/-/g, " ").replace(/^./, (char) => char.toUpperCase())
    : "EBB";
}
