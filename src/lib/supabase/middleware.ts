import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, publicEnv } from "@/config/env";

export interface SessionCheck {
  response: NextResponse;
  /** Null when there is no session, or when Supabase is not configured. */
  userId: string | null;
  configured: boolean;
}

/**
 * Refreshes the Supabase auth cookie on every matched request and reports
 * whether a session exists. Called from `src/middleware.ts`.
 */
export async function updateSession(
  request: NextRequest,
): Promise<SessionCheck> {
  let response = NextResponse.next({ request });

  if (!isSupabaseConfigured()) {
    return { response, userId: null, configured: false };
  }

  const supabase = createServerClient(
    publicEnv.supabaseUrl,
    publicEnv.supabaseAnonKey,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          for (const { name, value } of cookiesToSet) {
            request.cookies.set(name, value);
          }
          response = NextResponse.next({ request });
          for (const { name, value, options } of cookiesToSet) {
            response.cookies.set(name, value, options);
          }
        },
      },
    },
  );

  // `getUser()` revalidates the token against Supabase. Do not swap this for
  // `getSession()`, which trusts the cookie contents without verification.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return { response, userId: user?.id ?? null, configured: true };
}
