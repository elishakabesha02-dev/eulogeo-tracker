/**
 * Central, validated access to environment variables.
 *
 * Rules enforced here:
 *  - `NEXT_PUBLIC_*` values are the only ones safe to read in the browser.
 *  - `serverEnv` throws if imported from a client bundle, so the service role
 *    key can never leak through an accidental import.
 */

import { z } from "zod";

const publicSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional().or(z.literal("")),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_APP_NAME: z.string().optional(),
  NEXT_PUBLIC_APP_URL: z.string().optional(),
  NEXT_PUBLIC_ALLOW_DEMO_MODE: z.string().optional(),
});

// Next.js inlines `process.env.NEXT_PUBLIC_*` only for literal member access,
// so each variable is read explicitly rather than through a loop.
const parsedPublic = publicSchema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_NAME: process.env.NEXT_PUBLIC_APP_NAME,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  NEXT_PUBLIC_ALLOW_DEMO_MODE: process.env.NEXT_PUBLIC_ALLOW_DEMO_MODE,
});

const publicValues = parsedPublic.success ? parsedPublic.data : {};

export const publicEnv = {
  supabaseUrl: publicValues.NEXT_PUBLIC_SUPABASE_URL || "",
  supabaseAnonKey: publicValues.NEXT_PUBLIC_SUPABASE_ANON_KEY || "",
  appName: publicValues.NEXT_PUBLIC_APP_NAME || "EBB ATM Operations Intelligence",
  appUrl: publicValues.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  allowDemoMode: publicValues.NEXT_PUBLIC_ALLOW_DEMO_MODE !== "false",
} as const;

/**
 * True when both public Supabase values are present. Every repository consults
 * this before choosing a data source, which is what lets the app boot with an
 * empty `.env.local`.
 */
export function isSupabaseConfigured(): boolean {
  return Boolean(publicEnv.supabaseUrl && publicEnv.supabaseAnonKey);
}

/** Demo mode = no Supabase project, and the fallback has not been disabled. */
export function isDemoMode(): boolean {
  return !isSupabaseConfigured() && publicEnv.allowDemoMode;
}

/* -------------------------------------------------------------------------- */
/*  Server-only                                                               */
/* -------------------------------------------------------------------------- */

export type AiProviderId = "mock" | "anthropic" | "openai";

interface ServerEnv {
  supabaseServiceRoleKey: string;
  storageBucket: string;
  aiProvider: AiProviderId;
  aiApiKey: string;
  aiModel: string;
}

/**
 * Reads server-only variables. Guarded so a client component importing this by
 * mistake fails loudly at build time instead of shipping a secret to the browser.
 */
export function serverEnv(): ServerEnv {
  if (typeof window !== "undefined") {
    throw new Error(
      "serverEnv() was called in the browser. Server-only configuration must never reach the client bundle.",
    );
  }

  const provider = process.env.AI_PROVIDER ?? "mock";

  return {
    supabaseServiceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? "",
    storageBucket: process.env.SUPABASE_STORAGE_BUCKET ?? "ebb-documents",
    aiProvider: (["mock", "anthropic", "openai"] as const).includes(
      provider as AiProviderId,
    )
      ? (provider as AiProviderId)
      : "mock",
    aiApiKey: process.env.AI_API_KEY ?? "",
    aiModel: process.env.AI_MODEL ?? "",
  };
}
