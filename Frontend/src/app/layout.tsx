import type { Metadata, Viewport } from "next";
import { Anybody, Hanken_Grotesk, JetBrains_Mono, Noto_Kufi_Arabic } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getLocale, getMessages, getTranslations } from "next-intl/server";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { HeaderScrollState } from "@/components/layout/header-scroll-state";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { HideOnCheckout, ShowOnCheckout } from "@/components/layout/checkout-chrome";
import { CheckoutHeader } from "@/components/layout/checkout-header";
import { getContentServer } from "@/lib/api/gym-server";
import { contentList } from "@/types/gym";
import { BRAND } from "@/lib/brand";
import { ArabicUiTranslator } from "@/components/i18n/arabic-ui-translator";
import "./globals.css";

// Running text. Requested as a variable range rather than a fixed list of
// weights: one file covers 400 through 700, which is fewer bytes than the
// three static cuts the UI actually uses.
const hanken = Hanken_Grotesk({
  variable: "--font-hanken",
  subsets: ["latin"],
});

// Every headline. Two things here are load-bearing:
//
//   - `style: ["italic"]` is required. The slant is the brand — globals.css
//     asks for oblique on .font-display — and without the italic file shipped
//     the browser shears the upright instead, which on a heavy grotesque
//     thickens the diagonals and looks visibly wrong next to the logo.
//   - The weight range stops at 900 because display sizes use it; trimming
//     the low end off the range would save nothing, as this is one variable
//     file either way.
const anybody = Anybody({
  variable: "--font-anybody",
  subsets: ["latin"],
  style: ["normal", "italic"],
});

// Labels, eyebrows, buttons, stat captions — the "spec sheet" voice. Only the
// two weights the design uses, since this one is not a variable font on
// Google Fonts and each weight is a separate file.
const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin"],
  weight: ["500", "700"],
});

const notoKufi = Noto_Kufi_Arabic({
  variable: "--font-noto-kufi",
  subsets: ["arabic"],
  weight: ["400", "500", "600", "700", "800", "900"],
});

// Split out of `metadata` because Next requires it: themeColor, viewportFit and
// the width/scale defaults live on their own export, and setting them inside
// metadata is silently ignored.
//
// themeColor is the page ground. Without it a phone paints its address bar and
// status bar in the OS default — a bright band sitting directly on top of a
// near-black header, which is the first thing a visitor sees and reads as two
// unrelated apps stacked on each other. #121414 is --background; keep the two
// in step.
//
// viewportFit: "cover" is not cosmetic. Every env(safe-area-inset-*) in the app
// reports ZERO without it, so the floating WhatsApp button's clearance from the
// iPhone home indicator depends on this line existing.
//
// No maximumScale or userScalable: pinch-zoom stays available. Locking it is a
// WCAG 1.4.4 failure and the only thing it would buy is hiding the input-zoom
// problem that is now fixed properly, at the font size.
export const viewport: Viewport = {
  themeColor: "#121414",
  colorScheme: "dark",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3001"),
  // Deliberately a bare default rather than a template: every page already
  // spells out its own "… — PrimeX" title, so a template would
  // append the brand a second time. This is what shows for the homepage and
  // for any page that sets no title of its own — so it carries the tagline,
  // because the brand name alone tells a stranger nothing.
  title: `${BRAND.name} — ${BRAND.tagline}`,
  description: BRAND.description,
  // Icons are not declared here on purpose: app/icon.png and app/apple-icon.png
  // are picked up by file convention, which emits the correct tags with a
  // content hash. Declaring them here as well would ship two competing sets.
  openGraph: {
    type: "website",
    siteName: BRAND.name,
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    // Absolute-resolved against metadataBase. WhatsApp and Facebook both
    // refuse to scrape a relative one, which is how a share ends up as a
    // grey box.
    images: [
      {
        url: "/brand/og.jpg",
        width: 1200,
        height: 630,
        alt: `${BRAND.name} — ${BRAND.tagline}`,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${BRAND.name} — ${BRAND.tagline}`,
    description: BRAND.description,
    images: ["/brand/og.jpg"],
  },
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const locale = await getLocale();
  const messages = await getMessages();
  const common = await getTranslations("Common");
  // Content, not layout, is what the announcement bar is — its words are
  // staff-editable copy like every other block in content.registry.ts, so it
  // is fetched the same way page.tsx fetches everything else rather than
  // hardcoded here. getContentServer never throws (see server-fetch.ts), so
  // an unreachable API loses the bar, not the entire site shell.
  const content = await getContentServer(locale === "ar" ? "ar" : "en");
  const announcements = contentList(content, "site.announcementBar");

  // The `dark` class below is not a theme switch — there is only one theme.
  // It is there because the codebase carries ~29 `dark:` variants (shadcn's
  // primitives plus the checkout panels) which resolve through @custom-variant
  // against `.dark`, and with no such class anywhere on the tree not one of
  // them ever applied. The visible symptom was the payment section rendering
  // its light-mode fallbacks — #f4f4f4 panels, #d9d9d9 borders — on a
  // near-black page, because those hardcoded values were only ever meant to be
  // overridden by the dark: variant sitting right next to them.
  //
  // The .dark block in globals.css is kept identical to :root, so this changes
  // no colour token; it only lets those variants resolve.
  return (
    <html
      lang={locale}
      dir={locale === "ar" ? "rtl" : "ltr"}
      data-locale={locale}
      suppressHydrationWarning
      className={`dark ${hanken.variable} ${anybody.variable} ${jetbrains.variable} ${notoKufi.variable} h-full antialiased`}
    >
      {/* The grain sits on the body so it washes the entire document rather
          than stopping at the last section — a page shorter than the viewport
          would otherwise show clean, ungrained ground beneath the footer. */}
      <body suppressHydrationWarning className="industrial-grain flex min-h-full flex-col">
        {/* Reveal-on-scroll ships its elements hidden and lets an observer
            un-hide them, which means no observer would leave the page blank.
            Without JavaScript there is no observer, so the hidden state is
            switched off entirely rather than trusting it to be lifted. */}
        <noscript>
          <style>{`[data-reveal],[data-photo]{opacity:1!important;transform:none!important}
                   .motion-rise{opacity:1!important;animation:none!important}`}</style>
        </noscript>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-foreground focus:outline focus:outline-2 focus:outline-foreground"
        >
          {common("skipToContent")}
        </a>
        {/* Zero height, sits above the header, and exists only to be watched
            — see HeaderScrollState. */}
        <div id="scroll-sentinel" aria-hidden="true" />
        <NextIntlClientProvider locale={locale} messages={messages}>
          <Providers>
            <ArabicUiTranslator />
            <HeaderScrollState />
          {/* The site shell everywhere except inside the join funnel, which
              brings its own — see components/layout/checkout-chrome.tsx for
              why a page being paid on should not offer eighteen ways out. */}
          <HideOnCheckout>
            <SiteHeader />
            <AnnouncementBar items={announcements} />
          </HideOnCheckout>
          <ShowOnCheckout>
            <CheckoutHeader />
          </ShowOnCheckout>
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <HideOnCheckout>
            <SiteFooter />
          </HideOnCheckout>
          </Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
