import { NextResponse, type NextRequest } from "next/server";

import { getServerSupabase } from "@/lib/supabase/server";

/**
 * OAuth / magic-link callback. Exchanges the one-time code for a session
 * cookie, then sends the user on.
 *
 * `next` is validated as a relative path before use — an open redirect here
 * would let an attacker bounce an authenticated user to an external site.
 */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const code = searchParams.get("code");
  const requested = searchParams.get("next") ?? "/dashboard";

  const next =
    requested.startsWith("/") && !requested.startsWith("//")
      ? requested
      : "/dashboard";

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=missing_code`);
  }

  const supabase = await getServerSupabase();
  if (!supabase) {
    return NextResponse.redirect(`${origin}/login?error=not_configured`);
  }

  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    return NextResponse.redirect(`${origin}/login?error=exchange_failed`);
  }

  return NextResponse.redirect(`${origin}${next}`);
}
