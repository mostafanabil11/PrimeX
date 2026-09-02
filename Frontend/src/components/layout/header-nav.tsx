"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/nav";
import { SHOP_ENABLED } from "@/lib/features";
import { stripLocalePrefix } from "@/i18n/config";
import { useLocale, useTranslations } from "next-intl";
import styles from "./desktop-header.module.css";

/**
 * The centre nav of the site header.
 *
 * A client component only because of the active state: the redesign marks the
 * current section with a white label and a 2px red rule under it, and the only
 * thing that knows which section that is, is the pathname. The header itself
 * stays a server component and hands this nothing — the link list is static.
 *
 * Hover raises the neutral surface; the red rule belongs only to the current
 * section. Every destination keeps a full 44px hit area and a keyboard ring.
 */
export function HeaderNav() {
  const pathname = stripLocalePrefix(usePathname());
  const t = useTranslations("Navigation");
  const isArabic = useLocale() === "ar";

  const links = SHOP_ENABLED
    ? [...PRIMARY_NAV, { label: "Shop", href: "/products" } as const]
    : PRIMARY_NAV;

  return (
    // xl, not lg — unchanged from before the redesign. At 1024 the bar cannot
    // hold six or seven links beside the lockup and the right-hand cluster;
    // below xl the same links are in the sheet MobileNav opens.
    <nav aria-label={isArabic ? "التنقل الرئيسي" : "Primary navigation"} className={styles.nav}>
      {links.map((item) => {
        // "/" would otherwise prefix-match every route on the site.
        const isActive =
          item.href === "/"
            ? pathname === "/"
            : pathname === item.href || pathname.startsWith(`${item.href}/`);

        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={isActive ? "page" : undefined}
            className={`${styles.navLink} font-mono font-semibold uppercase`}
          >
            {item.href === "/" ? t("home") : item.href === "/membership" ? t("membership") : item.href === "/classes" ? t("classes") : item.href === "/trainers" ? t("trainers") : item.href === "/contact" ? t("contact") : item.label}
          </Link>
        );
      })}
    </nav>
  );
}
