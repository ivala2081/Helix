// Middleware does two things:
//   1. Locale: on first visit, detect preferred language and set a cookie (all routes).
//   2. Auth: on /app and /admin, refresh the Supabase session and redirect
//      unauthenticated users to /login. Role enforcement for /admin lives in the
//      admin layout (defense in depth). Supabase is only contacted on gated
//      routes so marketing pages stay fast.

import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  isLocale,
  LOCALE_COOKIE,
  pickLocaleFromAcceptLanguage,
} from "./lib/i18n/locales";

const LOCALE_COOKIE_OPTS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  const existingLocale = req.cookies.get(LOCALE_COOKIE);
  const localeToSet =
    !existingLocale || !isLocale(existingLocale.value)
      ? pickLocaleFromAcceptLanguage(req.headers.get("accept-language"))
      : null;

  const gated = path.startsWith("/app") || path.startsWith("/admin");

  // Fast path: non-gated routes only need the locale cookie.
  if (!gated) {
    const res = NextResponse.next();
    if (localeToSet) res.cookies.set(LOCALE_COOKIE, localeToSet, LOCALE_COOKIE_OPTS);
    return res;
  }

  // Gated routes: refresh the session and enforce login.
  let response = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => req.cookies.set(name, value));
          response = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // getUser() revalidates the token server-side (do not trust getSession here).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const redirectUrl = req.nextUrl.clone();
    redirectUrl.pathname = "/login";
    redirectUrl.searchParams.set("next", path);
    return NextResponse.redirect(redirectUrl);
  }

  if (localeToSet) response.cookies.set(LOCALE_COOKIE, localeToSet, LOCALE_COOKIE_OPTS);
  return response;
}

export const config = {
  // Skip Next internals + the klines API + static assets
  matcher: ["/((?!_next|api|cron|favicon.ico|icon|apple-icon|opengraph-image|manifest).*)"],
};
