"use client";

import { useState, type CSSProperties } from "react";
import { Link } from "@/i18n/navigation";
import { usePathname } from "next/navigation";
import { Menu, MapPin, Phone, Clock, ArrowRight, X } from "lucide-react";
import { Sheet, SheetTrigger, SheetContent, SheetClose, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { actionButtonClasses } from "@/components/ui/action-button";
import { PRIMARY_NAV } from "@/lib/nav";
import { Wordmark } from "./wordmark";
import { SocialLinks } from "@/components/public/floating-contact";
import { SHOP_ENABLED } from "@/lib/features";
import { LanguageSwitcher } from "./language-switcher";
import { stripLocalePrefix } from "@/i18n/config";
import { useLocale, useTranslations } from "next-intl";
import styles from "./mobile-nav.module.css";
import { AccountMenu } from "./account-menu";

/** Server-provided contact details match the footer and contact page. */
export type MobileNavContact = {
  address: string;
  mapsUrl: string;
  phone: string | null;
  hours: string;
};

export function MobileNav({ contact }: { contact?: MobileNavContact | null }) {
  const [open, setOpen] = useState(false);
  const pathname = stripLocalePrefix(usePathname());
  const isArabic = useLocale() === "ar";
  const t = useTranslations("Navigation");
  const common = useTranslations("Common");
  const links = SHOP_ENABLED
    ? [...PRIMARY_NAV, { label: "Shop", href: "/products" } as const]
    : PRIMARY_NAV;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger render={
        <Button variant="ghost" size="icon" className="relative z-[60] size-11 xl:hidden"
          aria-label={isArabic ? "فتح القائمة" : "Open menu"} />
      }>
        <Menu aria-hidden className="size-6" />
      </SheetTrigger>
      <SheetContent side={isArabic ? "right" : "left"} className={styles.drawer}
        overlayClassName={styles.backdrop} showCloseButton={false}>
        {/* First in focus order, so opening the menu focuses a real control. */}
        <SheetClose className={styles.close} aria-label={isArabic ? "إغلاق القائمة" : "Close menu"}>
          <X aria-hidden size={20} strokeWidth={1.7} />
        </SheetClose>
        <SheetTitle className="sr-only">{isArabic ? "القائمة الرئيسية" : "Main navigation"}</SheetTitle>
        <div className={styles.header}>
          <Link href="/" onClick={() => setOpen(false)} className={styles.logo}>
            <Wordmark className="h-16 w-auto" width={124} />
          </Link>
          <div className={`${styles.status} font-mono font-semibold uppercase`}>
            <Clock aria-hidden className={styles.statusIcon} size={14} strokeWidth={1.6} />
            <span>{common("openAlways")}</span>
          </div>
        </div>
        <div className={styles.scrollArea}>
          <nav className={styles.links} aria-label={isArabic ? "التنقل الرئيسي" : "Primary navigation"}>
            {links.map((item, index) => {
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);
              return (
                <Link key={item.href} href={item.href} onClick={() => setOpen(false)}
                  aria-current={isActive ? "page" : undefined}
                  style={{ "--link-index": index } as CSSProperties}
                  className={`${styles.link} font-mono font-bold uppercase`}>
                  <span aria-hidden className={styles.index}>{String(index + 1).padStart(2, "0")}</span>
                  <span className={styles.label}>
                    {item.href === "/" ? t("home") : item.href === "/about" ? t("about") : item.href === "/membership" ? t("membership") : item.href === "/classes" ? t("classes") : item.href === "/trainers" ? t("trainers") : item.href === "/contact" ? t("contact") : item.label}
                  </span>
                  <ArrowRight aria-hidden className={styles.arrow} size={17} strokeWidth={1.6} />
                </Link>
              );
            })}
          </nav>
          <div className={styles.memberAccess} onClick={(event) => {
            // Account links and portaled dropdown choices should dismiss the
            // drawer after selection, but opening the account dropdown should not.
            if (event.target instanceof Element && event.target.closest('a, [role="menuitem"]')) {
              setOpen(false);
            }
          }}>
            <AccountMenu className="flex min-h-11 w-full items-center justify-start px-3 font-mono text-[13px] font-bold uppercase" />
          </div>
          {contact && (
            <div className={styles.contact}>
              <a href={contact.mapsUrl} target="_blank" rel="noopener noreferrer" onClick={() => setOpen(false)}>
                <MapPin aria-hidden size={16} /><span>{contact.address}</span>
              </a>
              {contact.phone && <a href={`tel:${contact.phone.replace(/\s/g, "")}`}>
                <Phone aria-hidden size={16} /><span dir="ltr">{contact.phone}</span>
              </a>}
              <p><Clock aria-hidden size={16} /><span>{contact.hours}</span></p>
            </div>
          )}
        </div>
        <div className={styles.footer}>
          <Link href="/membership" onClick={() => setOpen(false)}
            className={actionButtonClasses({ fullWidth: true, className: styles.join })}>
            {common("joinNow")}<ArrowRight aria-hidden size={18} />
          </Link>
          <div className={styles.utilities}>
            <SocialLinks className={styles.socials} />
            <LanguageSwitcher className={styles.language} />
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
