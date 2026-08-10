import "server-only";

import { createServerClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

import { isSupabaseConfigured, publicEnv } from "@/config/env";

/**
 * Request-scoped Supabase client for Server Components, Server Actions and
 * Route Handlers. Uses the anon key, so every query is still subject to Row
 * Level Security — authorization is enforced by the database, not by the caller.
 *
 * Returns `null` when no project is configured (demo mode).
 */
export async function getServerSupabase(): Promise<SupabaseClient | null> {
  if (!isSupabaseConfigured()) return null;

  const cookieStore = await cookies();

  return createServerClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server Components cannot set cookies. The middleware refreshes the
          // session on every request, so this is safe to ignore here.
        }
      },
    },
  });
}
