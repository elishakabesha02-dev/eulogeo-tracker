import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { AppShell } from "@/components/layout/app-shell";
import { NAVIGATION } from "@/config/navigation";
import { signOutAction } from "@/lib/auth/actions";
import { can } from "@/lib/auth/permissions";
import { getSession } from "@/lib/auth/session";
import { countUnreadNotifications } from "@/lib/database/repositories/notifications";

/**
 * Every authenticated page depends on the current session, so nothing under
 * this segment may be prerendered at build time.
 */
export const dynamic = "force-dynamic";

/**
 * Protected shell.
 *
 * The middleware already redirects unauthenticated requests, but this layout
 * checks again on the server. Middleware is routing; this is authorization, and
 * the two should not share a single point of failure.
 */
export default async function AppLayout({ children }: { children: ReactNode }) {
  const { user, isDemo } = await getSession();

  if (!user) redirect("/login");

  // Navigation is filtered by permission on the server, so a role that cannot
  // reach a module never sees a link to it.
  const allowedHrefs = NAVIGATION.flatMap((section) => section.items)
    .filter((item) => !item.permission || can(user, item.permission))
    .map((item) => item.href);

  const unreadNotifications = can(user, "notification:read")
    ? await countUnreadNotifications()
    : 0;

  return (
    <AppShell
      allowedHrefs={allowedHrefs}
      user={{
        name: user.profile.full_name,
        email: user.email,
        role: user.profile.role,
      }}
      unreadNotifications={unreadNotifications}
      isDemo={isDemo}
      signOut={signOutAction}
    >
      {children}
    </AppShell>
  );
}
