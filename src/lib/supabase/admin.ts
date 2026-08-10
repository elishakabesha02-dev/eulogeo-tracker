import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, publicEnv, serverEnv } from "@/config/env";

let cached: SupabaseClient | null = null;

/**
 * Service-role client. BYPASSES ROW LEVEL SECURITY.
 *
 * Only for operations that legitimately act outside a user's own scope:
 * writing audit logs, system notifications, and signing storage URLs after the
 * caller has already been authorized in the service layer.
 *
 * Never import this from a client component — `server-only` makes that a build
 * error, and `serverEnv()` throws if it somehow runs in a browser.
 */
export function getAdminSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;

  const { supabaseServiceRoleKey } = serverEnv();
  if (!supabaseServiceRoleKey) return null;

  if (cached) return cached;

  cached = createClient(publicEnv.supabaseUrl, supabaseServiceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  return cached;
}
