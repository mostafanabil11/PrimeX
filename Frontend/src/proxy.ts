import { NextResponse, type NextRequest } from "next/server";
import { LOCALE_COOKIE } from "@/i18n/config";

const COOKIE_OPTIONS = {
  path: "/",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 365,
};

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isArabicPath = pathname === "/ar" || pathname.startsWith("/ar/");
  const underlyingPath = isArabicPath ? (pathname === "/ar" ? "/" : pathname.slice(3) || "/") : pathname;
  const isAdminPath = underlyingPath === "/admin" || underlyingPath.startsWith("/admin/");
  const requestHeaders = new Headers(request.headers);

  // Admin is English-only and never lives under /ar. Bounce a mistaken
  // /ar/admin/... straight to the real path instead of rewriting it into
  // Arabic, and — unlike every other route — never redirect a bare /admin
  // visit into /ar/admin just because the visitor's site-wide preference
  // cookie says "ar". The cookie itself is left untouched so their public-site
  // preference survives the trip through admin.
  if (isAdminPath) {
    requestHeaders.set("x-primex-locale", "en");
    if (isArabicPath) {
      const destination = request.nextUrl.clone();
      destination.pathname = underlyingPath;
      return NextResponse.redirect(destination);
    }
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  if (isArabicPath) {
    requestHeaders.set("x-primex-locale", "ar");
    const destination = request.nextUrl.clone();
    destination.pathname = pathname === "/ar" ? "/" : pathname.slice(3) || "/";

    const response = NextResponse.rewrite(destination, {
      request: { headers: requestHeaders },
    });
    response.cookies.set(LOCALE_COOKIE, "ar", COOKIE_OPTIONS);
    return response;
  }

  // Client-side router calls that still use an unprefixed path keep the
  // visitor in Arabic. Normal links use the localized Link wrapper and do not
  // pay this redirect; this is the safety net for imperative router.push calls.
  if (request.cookies.get(LOCALE_COOKIE)?.value === "ar") {
    const destination = request.nextUrl.clone();
    destination.pathname = pathname === "/" ? "/ar" : `/ar${pathname}`;
    return NextResponse.redirect(destination);
  }

  requestHeaders.set("x-primex-locale", "en");
  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.cookies.set(LOCALE_COOKIE, "en", COOKIE_OPTIONS);
  return response;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
