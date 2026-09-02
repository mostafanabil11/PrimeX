"use client";

import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "@/lib/nav";
import { SHOP_ENABLED } from "@/lib/features";
import { stripLocalePrefix } from "@/i18n/config";
import { useTranslations } from "next-intl";

/**
 * The centre nav of the site header.
 *
 * A client component only because of the active state: the redesign marks the
 * current section with a white label and a 2px red rule under it, and the only
 * thing that knows which section that is, is the pathname. The header itself
 * stays a server component and hands this nothing — the link list is static.
 *
 * Hover is a COLOUR change, not the growing underline this bar used to have.
 * With the active route now permanently underlined, an animated underline on
 * hover made every link look momentarily current, which is the one thing the
 * underline is supposed to tell you.
 */
export function HeaderNav() {
  const pathname = stripLocalePrefix(usePathname());
  const t = useTranslations("Navigation");

  const links = SHOP_ENABLED
    ? [...PRIMARY_NAV, { label: "Shop", href: "/products" } as const]
    : PRIMARY_NAV;

  return (
    // xl, not lg — unchanged from before the redesign. At 1024 the bar cannot
    // hold six or seven links beside the lockup and the right-hand cluster;
    // below xl the same links are in the sheet MobileNav opens.
    <nav className="hidden items-center gap-5 xl:flex 2xl:gap-[30px]">
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
            // -my-3/py-3 keeps the 44px tap target the bar has always had
            // while the text itself still sits on the design's 12px line, and
            // lets the rule below hug the word rather than the hit box.
            className={`relative -my-3 inline-flex min-h-11 items-center py-3 font-mono text-[12px] font-medium tracking-[0.142em] whitespace-nowrap uppercase transition-colors duration-150 ${
              isActive ? "text-foreground" : "text-muted-foreground hover:text-primary-soft"
            }`}
          >
            {item.href === "/" ? t("home") : item.href === "/about" ? t("about") : item.href === "/membership" ? t("membership") : item.href === "/classes" ? t("classes") : item.href === "/trainers" ? t("trainers") : item.href === "/contact" ? t("contact") : item.label}
            {isActive && (
              <span aria-hidden className="absolute bottom-1.5 start-0 h-0.5 w-full bg-primary" />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
