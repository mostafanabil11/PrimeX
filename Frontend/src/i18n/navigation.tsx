"use client";

import NextLink, { type LinkProps } from "next/link";
import { useLocale } from "next-intl";
import type { ComponentProps } from "react";
import { isAppLocale, localizeHref } from "./config";

type Props = LinkProps & Omit<ComponentProps<"a">, keyof LinkProps>;

/** Locale-aware drop-in replacement for next/link. */
export function Link({ href, ...props }: Props) {
  const currentLocale = useLocale();
  const locale = isAppLocale(currentLocale) ? currentLocale : "en";
  const localizedHref =
    typeof href === "string"
      ? localizeHref(href, locale)
      : { ...href, pathname: href.pathname ? localizeHref(String(href.pathname), locale) : href.pathname };

  return <NextLink href={localizedHref} {...props} />;
}

export default Link;
