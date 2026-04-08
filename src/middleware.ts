// Middleware: on first visit, detect the user's preferred language from
// the Accept-Language header and set a cookie. Subsequent visits and SSR
// requests use the cookie. Users can override via the language switcher.

import { NextResponse, type NextRequest } from "next/server";
import {
  isLocale,
  LOCALE_COOKIE,
  pickLocaleFromAcceptLanguage,
} from "./lib/i18n/locales";

export function middleware(req: NextRequest) {
  const existing = req.cookies.get(LOCALE_COOKIE);
  if (existing && isLocale(existing.value)) {
    return NextResponse.next();
  }
  const detected = pickLocaleFromAcceptLanguage(req.headers.get("accept-language"));
  const res = NextResponse.next();
  res.cookies.set(LOCALE_COOKIE, detected, {
    path: "/",
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 365, // 1 year
  });
  return res;
}

export const config = {
  // Skip Next internals + the klines API + static assets
  matcher: ["/((?!_next|api|favicon.ico|icon|apple-icon|opengraph-image|manifest).*)"],
};
