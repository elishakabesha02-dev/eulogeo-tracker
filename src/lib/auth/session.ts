import "server-only";

import { cache } from "react";

import { isSupabaseConfigured, publicEnv } from "@/config/env";
import { DEMO_USER_ID, demoProfiles } from "@/lib/database/demo/dataset";
import { forbidden, unauthenticated } from "@/lib/database/errors";
import { can } from "@/lib/auth/permissions";
import { getProfileByUserId } from "@/lib/database/repositories/profiles";
import { getServerSupabase } from "@/lib/supabase/server";
import type { AppUser, Permission, Profile, SessionContext } from "@/types/auth";

/**
 * Resolves the current user for the request.
 *
 * `cache()` deduplicates the lookup across a single render pass, so a layout, a
 * page and three server components all share one round trip.
 *
 * When Supabase is not configured the app runs in demo mode against a fixed
 * synthetic administrator. That is a development convenience, never a login
 * bypass: with a project configured, an unauthenticated request resolves to
 * `null` and the middleware redirects to `/login`.
 */
export const getSession = cache(async (): Promise<SessionContext> => {
  if (!isSupabaseConfigured()) {
    if (!publicEnv.allowDemoMode) return { user: null, isDemo: false };

    const profile = demoProfiles[0] as Profile;
    return {
      user: { id: DEMO_USER_ID, email: profile.email, profile },
      isDemo: true,
    };
  }

  const supabase = await getServerSupabase();
  if (!supabase) return { user: null, isDemo: false };

  // getUser() verifies the JWT with Supabase. getSession() would only read the
  // cookie, which a client can tamper with.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return { user: null, isDemo: false };

  const profile = await getProfileByUserId(user.id);
  if (!profile) {
    // Authenticated but no profile row — treat as unprovisioned rather than
    // inventing a role.
    return { user: null, isDemo: false };
  }

  return {
    user: { id: user.id, email: user.email ?? profile.email, profile },
    isDemo: false,
  };
});

export async function getCurrentUser(): Promise<AppUser | null> {
  return (await getSession()).user;
}

/** Throws `UNAUTHENTICATED` when there is no session. For use in services. */
export async function requireUser(): Promise<AppUser> {
  const user = await getCurrentUser();
  if (!user) throw unauthenticated();
  return user;
}

/**
 * The single authorization checkpoint for the service layer. Every mutating
 * service calls this before touching a repository.
 */
export async function requirePermission(
  permission: Permission,
): Promise<AppUser> {
  const user = await requireUser();
  if (!can(user, permission)) throw forbidden(`perform "${permission}"`);
  return user;
}
