export const LOCALES = ["en", "ar"] as const;
export type AppLocale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: AppLocale = "en";
export const LOCALE_COOKIE = "PRIMEX_LOCALE";

export function isAppLocale(value: string | null | undefined): value is AppLocale {
  return value === "en" || value === "ar";
}

export function stripLocalePrefix(pathname: string): string {
  if (pathname === "/ar") return "/";
  return pathname.startsWith("/ar/") ? pathname.slice(3) || "/" : pathname;
}

export function localizePath(pathname: string, locale: AppLocale): string {
  const clean = stripLocalePrefix(pathname || "/");
  if (locale === "ar") return clean === "/" ? "/ar" : `/ar${clean}`;
  return clean;
}

export function localizeHref(href: string, locale: AppLocale): string {
  if (
    !href.startsWith("/") ||
    href.startsWith("//") ||
    href.startsWith("/api/") ||
    href.startsWith("/_next/")
  ) {
    return href;
  }

  const [pathAndQuery, hash = ""] = href.split("#", 2);
  const queryIndex = pathAndQuery.indexOf("?");
  const pathname = queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);
  const query = queryIndex === -1 ? "" : pathAndQuery.slice(queryIndex);
  const localized = localizePath(pathname || "/", locale);
  return `${localized}${query}${hash ? `#${hash}` : ""}`;
}
