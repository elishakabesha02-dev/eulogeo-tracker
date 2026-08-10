"use client";

import { createBrowserClient } from "@supabase/ssr";
import type { SupabaseClient } from "@supabase/supabase-js";

import { isSupabaseConfigured, publicEnv } from "@/config/env";

let cached: SupabaseClient | null = null;

/**
 * Browser Supabase client (anon key only).
 *
 * Returns `null` when no project is configured so the UI can degrade to demo
 * mode instead of crashing on a missing environment variable.
 */
export function getBrowserSupabase(): SupabaseClient | null {
  if (!isSupabaseConfigured()) return null;
  if (cached) return cached;

  cached = createBrowserClient(publicEnv.supabaseUrl, publicEnv.supabaseAnonKey);
  return cached;
}
