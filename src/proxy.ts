import { NextResponse, type NextRequest } from "next/server";

import { updateSession } from "@/lib/supabase/middleware";

/** Routes reachable without a session. Everything else requires one. */
const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/error"];

function isPublic(pathname: string): boolean {
  return PUBLIC_PATHS.some(
    (path) => pathname === path || pathname.startsWith(`${path}/`),
  );
}

/**
 * Next.js 16 renamed the `middleware` file convention to `proxy`. The export
 * must be named `proxy` to match.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { response, userId, configured } = await updateSession(request);

  // Demo mode: no Supabase project, so there is nothing to authenticate
  // against. The app is browsable with synthetic data and says so in the UI.
  if (!configured) {
    if (pathname === "/login") {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
    return response;
  }

  if (!userId && !isPublic(pathname)) {
    const loginUrl = new URL("/login", request.url);
    // Preserve the destination so sign-in can return the user to it.
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  if (userId && pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Everything except static assets and image optimisation, which never need
     * a session check and would only add latency.
     */
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
