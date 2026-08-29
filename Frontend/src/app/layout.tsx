import type { Metadata } from "next";
import { Anybody, Hanken_Grotesk, JetBrains_Mono } from "next/font/google";
import { Providers } from "@/components/providers";
import { SiteHeader } from "@/components/layout/site-header";
import { HeaderScrollState } from "@/components/layout/header-scroll-state";
import { AnnouncementBar } from "@/components/layout/announcement-bar";
import { SiteFooter } from "@/components/layout/site-footer";
import { FloatingContact } from "@/components/public/floating-contact";
import { getContentServer } from "@/lib/api/gym-server";
import { contentList } from "@/types/gym";
import { BRAND } from "@/lib/brand";
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
  // Content, not layout, is what the announcement bar is — its words are
  // staff-editable copy like every other block in content.registry.ts, so it
  // is fetched the same way page.tsx fetches everything else rather than
  // hardcoded here. getContentServer never throws (see server-fetch.ts), so
  // an unreachable API loses the bar, not the entire site shell.
  const content = await getContentServer();
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
      lang="en"
      suppressHydrationWarning
      className={`dark ${hanken.variable} ${anybody.variable} ${jetbrains.variable} h-full antialiased`}
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
          Skip to main content
        </a>
        {/* Zero height, sits above the header, and exists only to be watched
            — see HeaderScrollState. */}
        <div id="scroll-sentinel" aria-hidden="true" />
        <Providers>
          <HeaderScrollState />
          <SiteHeader />
          <AnnouncementBar items={announcements} />
          <main id="main-content" className="flex-1">
            {children}
          </main>
          <SiteFooter />
          <FloatingContact />
        </Providers>
      </body>
    </html>
  );
}
