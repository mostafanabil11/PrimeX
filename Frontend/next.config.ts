import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Where the API really lives. Server Components talk to it directly (no browser
// involved, so no cookie or CORS question), and the rewrite below points at it.
const API_ORIGIN = process.env.API_ORIGIN ?? process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:3000";

const nextConfig: NextConfig = {
  // Next 16 serves /_next/* dev resources only to the origin the dev server
  // was addressed by, so opening the site as 127.0.0.1 instead of localhost
  // silently blocks every client chunk — the HTML renders but nothing
  // hydrates. Both spellings point at this machine, so both are allowed.
  // Dev-only setting; it has no effect on a production build.
  allowedDevOrigins: ["127.0.0.1", "localhost"],

  // No remotePatterns and no dangerouslyAllowLocalIP: product and category
  // images are stored as root-relative paths and served by this app out of
  // public/, so the optimizer never makes an outbound request. Both settings
  // existed only to permit fetching from http://localhost:3001, which is what
  // the database used to store — and which resolved, in production, to the
  // visitor's own machine.
  //
  // Moving images to a real host later means adding that host here; it does
  // not mean bringing back the local-IP escape hatch.
  images: {
    // Next 16 narrowed the default to [75] and now *coerces* any other value
    // to the nearest allowed one rather than erroring — so a quality prop of
    // 90 silently became 75 and the difference was invisible until the emitted
    // URL was read. 90 is here for the hero, whose hard equipment edges and
    // large flat wall gradients are where JPEG artefacts actually show; 75
    // stays the default everything else uses.
    qualities: [75, 90],
  },

  // Hide the Next.js dev tools indicator in the corner during development.
  //
  // `false`, not `{ buildActivity: false }`. Next 16 removed the per-flag
  // shape — the object now takes `position` and nothing else — so the old form
  // was a type error that failed `next build` while `next dev` carried on
  // working, which is how it survived unnoticed. Verified against
  // node_modules/next/dist/server/config-shared.d.ts, where the type reads
  // `devIndicators?: false | { position?: … }`.
  devIndicators: false,

  // The browser talks to the API through this app's own origin.
  //
  // Deployed, the site and the API sit on unrelated domains (vercel.app and
  // onrender.com), which makes the session cookie a *third-party* cookie.
  // Safari blocks those outright and Chrome is removing them, so signing in
  // appeared to work and then every following request arrived anonymous:
  // refreshing signed you out, the cart refused to add anything, and the admin
  // area came back empty. It looked like a mobile bug because desktop Chrome
  // still permits third-party cookies today.
  //
  // Proxying through /api/backend makes the cookie first-party — same origin as
  // the page — which no browser has any reason to drop.
  // Security headers for every page and asset this app serves.
  //
  // Helmet sets the equivalent on the API, but nothing a visitor loads in a
  // browser comes from the API — the HTML, the scripts and the styles are all
  // served by Next, and without this they went out bare. These are the headers
  // a scanner flags on the first pass: clickjacking, MIME sniffing, referrer
  // leakage, and HTTPS downgrade.
  //
  // A Content-Security-Policy is deliberately not among them. A strict CSP on a
  // Next app is real work — its runtime injects inline scripts and styles, so a
  // careless policy silently breaks hydration — and a wrong CSP is worse than
  // none. It is worth doing as its own change, tested against a running build,
  // rather than bundled in here where a mistake hides among safe headers.
  async headers() {
    const securityHeaders = [
      // No one may frame this site. Clickjacking protection, and the reason a
      // login or a join form cannot be overlaid inside an attacker's page.
      { key: "X-Frame-Options", value: "DENY" },
      // Stops a browser second-guessing a response's declared type, which is
      // how a file served as text gets executed as a script.
      { key: "X-Content-Type-Options", value: "nosniff" },
      // Send the full URL within our own origin, only the origin off-site — so
      // a path a member is on does not leak to WhatsApp, Google Maps or Paymob.
      { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      // Switch off device APIs the site never asks for, so nothing embedded or
      // injected can reach for a camera, a microphone or a location.
      { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
      // Once a browser has loaded us over HTTPS it must never try plain HTTP
      // again for two years. Not preloaded: that is a one-way commitment that
      // is painful to walk back, and it belongs to the real domain rather than
      // to this config.
      { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
    ];

    return [{ source: "/:path*", headers: securityHeaders }];
  },

  async rewrites() {
    return [
      {
        source: "/api/backend/:path*",
        destination: `${API_ORIGIN}/:path*`,
      },
    ];
  },

  // The gym consolidated onto one site, so the Locations index and the
  // per-branch pages are gone and Contact carries the address, hours and
  // facilities instead.
  //
  // Permanent rather than temporary: those URLs were in the sitemap and are
  // not coming back, so search engines should move whatever ranking they hold
  // over to /contact rather than keep checking. Any old link, printed card or
  // search result still lands somewhere useful instead of a 404.
  async redirects() {
    return [
      { source: "/locations", destination: "/contact", permanent: true },
      { source: "/locations/:slug", destination: "/contact", permanent: true },

      // The nav says "Personal training" and the page is titled that, so
      // /personal-training is what somebody types or guesses. /trainers stays
      // the canonical URL — it is already indexed and linked from the homepage,
      // the footer and every class page, and trading real inbound links for a
      // tidier path is a bad deal. Permanent, because this one is not a mode
      // that flips: the coach index lives at /trainers either way.
      { source: "/personal-training", destination: "/trainers", permanent: true },
      { source: "/personal-training/:slug", destination: "/trainers/:slug", permanent: true },

      // Showcase mode: membership sales and the class timetable are switched
      // off (see lib/features.ts). Not permanent — the flag is meant to flip
      // back, and a 308 would be cached by browsers past that point. The
      // pages themselves still call requireMembershipSales()/requireClassBooking()
      // as a backstop for anything that reaches them without going through
      // Next's router (a bookmark, a stale link elsewhere).
      // /join is the reservation funnel whenever membership tracking is on, and
      // the card funnel when sales is on. It only redirects when neither is —
      // i.e. when there is genuinely nothing there.
      ...(process.env.NEXT_PUBLIC_MEMBERSHIP_SALES_ENABLED === "true" ||
      process.env.NEXT_PUBLIC_MEMBERSHIP_TRACKING_ENABLED === "true"
        ? []
        : [{ source: "/join", destination: "/membership", permanent: false }]),
      ...(process.env.NEXT_PUBLIC_CLASS_BOOKING_ENABLED === "true"
        ? []
        : [{ source: "/schedule", destination: "/classes", permanent: false }]),
    ];
  },
};

const withNextIntl = createNextIntlPlugin();

export default withNextIntl(nextConfig);
