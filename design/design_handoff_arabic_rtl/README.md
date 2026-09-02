# Handoff: PrimeX Arabic / RTL

## Overview

PrimeX (gym, New Maadi, Cairo) needs an Arabic locale. The site is currently English-only, LTR-only, with `lang="en"` hardcoded in the root layout and no i18n library installed.

This document specifies that work. It is scoped to **Arabic/RTL only** — the mobile-homepage and checkout redesigns that preceded it are already merged (see [Appendix A](#appendix-a--already-shipped-do-not-redo) before you start, so you don't redo them).

**Read [Two content sources](#two-content-sources-read-this-first) before estimating.** The single biggest risk in this task is not RTL layout; it is that editorial copy lives in a CMS and UI chrome lives in the codebase, and both need Arabic independently.

---

## About the design files

`PrimeX Redesign.dc.html` and `PrimeX Current UI.dc.html` in this bundle are **design references written as standalone HTML**. They are prototypes showing intended look and behaviour. They are **not production code and must not be copied into the app.**

The task is to implement the Arabic locale in the existing Next.js App Router codebase using its established patterns — Tailwind v4 with `@theme` tokens, `next/font/google`, server components, TanStack Query. Open the HTML files in a browser to see the intended result; build it with the codebase's own tools.

Section `1c` of `PrimeX Redesign.dc.html` is the Arabic reference screen. Sections `1a` and `1b` are the English screens that already shipped — included only so you can see the LTR original each Arabic screen mirrors.

## Fidelity

**High-fidelity.** Colours, type, spacing and copy in `1c` are final and should be matched exactly. Every value is listed under [Design tokens](#design-tokens).

Two things in `1c` are explicitly **not** final and need a decision from the client before you build them — see [Open questions](#open-questions).

---

## Two content sources (read this first)

Text on this site comes from two places, and Arabic has to be solved separately in each.

**1. Editorial copy — lives in the CMS.** `getContentServer()` in `src/lib/api/gym-server.ts`, read through `contentList(content, "site.announcementBar")` and similar keyed lookups, with keys registered in `content.registry.ts`. Section headings, the announcement bar, the About page, facilities lists and every marketing sentence come from here. Plan names, tier names and class descriptions come from the API as `Plan` / `ClassType` records.

**2. UI chrome — lives in the components.** "Continue", "Total today", "Step 1 of 3", "Secured by Paymob", "Choose a tier", form labels, button text, `aria-label`s and `sr-only` text are hardcoded English strings in TSX.

A translation-file library solves (2) and does nothing for (1). Shipping only (2) produces an Arabic interface wrapped around English content, which is worse than no Arabic at all.

**Recommended split:**

- **(2) UI chrome →** `next-intl`, `messages/en.json` + `messages/ar.json`.
- **(1) Editorial copy →** locale-aware CMS fields. The backend content records need an Arabic variant per key, and `getContentServer(locale)` needs to resolve it with an English fallback so a missing translation degrades to English rather than to an empty section.

**(1) requires backend work and is the long pole.** Confirm with the client that the CMS can hold Arabic before committing to a delivery date. If it cannot, ship Arabic chrome over English content only as a deliberate, time-boxed interim, and only with the client's agreement.

---

## Routing & locale strategy

Use locale-segmented routes: `/` and `/join` stay English; `/ar` and `/ar/join` serve Arabic. This keeps both locales server-rendered and independently indexable, which matters — a Cairo gym should rank for Arabic queries.

Recommended: `next-intl` with the App Router `[locale]` segment. Move `src/app/*` under `src/app/[locale]/*`.

Required alongside it:

- `<html lang={locale} dir={locale === "ar" ? "rtl" : "ltr"}>` in the root layout, replacing the current hardcoded `lang="en"`. **Set `dir` on `<html>`, not on a wrapper div** — `position: fixed` elements (`StickyTotal`, `FloatingContact`, the mobile nav sheet) resolve their inset against the viewport, and a wrapper leaves them mirroring inconsistently with the rest of the page.
- `hreflang` alternates in `generateMetadata`, both directions.
- A locale switcher. Put it in the utility strip on desktop and in the mobile nav sheet; label it "العربية" / "English" — never a flag. Preserve the current path across the switch (`/membership` → `/ar/membership`).
- `alternates.canonical` in every page's metadata is currently a hardcoded English path. Each needs to become locale-aware.

Do **not** locale-segment `/admin`. It is staff-facing and English-only; leaving it out keeps a large surface out of scope. Confirm the same for `/account` — the spec below assumes account pages ARE translated, since a member who joined in Arabic will expect to manage their membership in Arabic.

---

## Typography

The display face, **Anybody**, has no Arabic coverage. Arabic needs a second display face.

**Use Noto Kufi Arabic.** Closest match to Anybody in weight and squareness at 800. Load via `next/font/google` alongside the existing three, exposed as a CSS variable the same way:

```ts
const notoKufi = Noto_Kufi_Arabic({
  subsets: ["arabic"],
  weight: ["400", "600", "800"],
  variable: "--font-noto-kufi",
  display: "swap",
});
```

Add `notoKufi.variable` to the `<html>` className list.

Three rules, all visible in `1c`:

1. **Upright, never italic.** The Latin display face is italic; Arabic is not. A synthesised Arabic italic reads as a rendering fault. Ensure `font-synthesis: none` covers the Arabic face — the codebase already sets this for Anybody.
2. **One family for the whole Arabic page.** Noto Kufi carries display, body and label roles in Arabic. Do not try to map JetBrains Mono's role onto an Arabic face — the mono "spec sheet" register does not exist in Arabic typography and looks like a mistake. Mono labels in Arabic become Noto Kufi at 600, no letter-spacing.
3. **Drop the tracking.** Every `tracking-[0.1em]`-style utility on a mono label must be removed for Arabic. Letter-spacing breaks Arabic glyph joining — this is a correctness bug, not a taste call.

Rule 3 is the one most easily missed. The codebase applies tracking in roughly 200 places. Handle it centrally:

```css
[dir="rtl"] .font-mono,
[dir="rtl"] .font-display {
  font-family: var(--font-noto-kufi), sans-serif;
  letter-spacing: normal;
  font-style: normal;
}
```

Put that in `globals.css` as a base-layer rule so it beats the utilities, then remove per-component overrides only where the cascade genuinely fails.

**Numerals.** `1c` uses Arabic-Indic (٢٢٬٧٨٠) in prose and Latin (22,780) in prices. See [Open questions](#open-questions) — needs client confirmation before you build it.

Any element mixing a Latin currency figure into Arabic text needs `dir="ltr"` on the figure itself, or bidi reordering will mangle it:

```tsx
<span dir="ltr" className="tabular-nums">EGP 22,780</span>
```

This applies to `formatPrice` / `formatAmount` output everywhere — the join funnel's `StickyTotal`, `OrderSummary`, `Row`, the pricing grid, product cards, and every admin-facing total you choose to translate.

---

## Physical-property audit

The codebase mostly uses Tailwind logical properties (`ps-`/`pe-`/`ms-`/`me-`/`start-`/`end-`) — `rail.tsx` and the ported `join-funnel.tsx` are already clean. The following are the remaining **physical** properties on public-facing components. Each needs converting or explicitly exempting.

### Must convert

| File | Line | Current | Change to | Note |
|---|---|---|---|---|
| `app/page.tsx` | 132 | `top-4 left-5` | `top-4 start-5` | Hero "open now" badge |
| `app/page.tsx` | 145 | `inset-y-0 left-0` | `inset-y-0 start-0` | Red accent bar |
| `app/page.tsx` | 403 | `md:text-left` | `md:text-start` | |
| `components/public/cards.tsx` | 141 | `bottom-0 left-0` | `bottom-0 start-0` | Duration chip on class card |
| `components/public/cards.tsx` | 256, 264 | `text-left`, `text-right` | `text-start`, `text-end` | |
| `components/layout/site-header.tsx` | 166 | `-ml-3.5 sm:-ml-7 lg:ml-0` | `-ms-3.5 sm:-ms-7 lg:ms-0` | **Logo overhang — verify visually, see below** |
| `components/layout/header-nav.tsx` | 54 | `bottom-1.5 left-0` | `bottom-1.5 start-0` | Active-link underline |
| `components/layout/mobile-nav.tsx` | 112 | `pl-4` | `ps-4` | |
| `components/layout/mobile-nav.tsx` | 119 | `top-1/2 left-0` | `top-1/2 start-0` | Active indicator tick |
| `components/layout/mobile-nav.tsx` | 170 | `-ml-3` | `-ms-3` | |
| `components/layout/site-footer.tsx` | 121, 125 | `md:text-right`, `md:ml-auto` | `md:text-end`, `md:ms-auto` | |
| `components/join/join-funnel.tsx` | 244 | `text-left` | `text-start` | Term grid buttons |
| `components/join/join-funnel.tsx` | 673, 682 | `ml-auto` | `ms-auto` | Desktop Continue / Pay |
| `components/join/join-funnel.tsx` | 1006 | `text-right` | `text-end` | `Row` value cell |
| `components/public/pricing-grid.tsx` | 202, 540, 548, 562 | `text-left`, `sticky left-0`, `pr-4` | `text-start`, `sticky start-0`, `pe-4` | Comparison table |
| `components/public/pricing-grid.tsx` | 339, 430 | `text-right` | `text-end` | |
| `components/public/whatsapp.tsx` | 81 | `mr-2` | `me-2` | Inline icon spacing |
| `components/products/product-card.tsx` | 32, 42 | `top-3 left-3`, `text-right` | `top-3 start-3`, `text-end` | |
| `components/checkout/order-summary.tsx` | 27 | `-top-2 -right-2` | `-top-2 -end-2` | Cart count badge |
| `components/layout/cart-icon-link.tsx` | 28 | `-top-2 -right-2` | `-top-2 -end-2` | Cart count badge |
| `components/checkout/address-section.tsx` | 66, 73 | `text-left`, `ml-2` | `text-start`, `ms-2` | |
| `components/checkout/payment-section.tsx` | 131 | `text-left` | `text-start` | |

### Needs a judgement call, not a find-and-replace

**`floating-contact.tsx:182`** — the desktop WhatsApp circle is pinned `right-[max(1.5rem,env(safe-area-inset-right))]`. Converting to `end-` mirrors it to the bottom-left in Arabic. Ask the client: WhatsApp's own float sits bottom-right in both directions and users may expect that, but a mirrored UI with one unmirrored element looks like a bug. **Recommendation: mirror it.** Consistency wins, and there is no muscle memory to protect on a gym site.

**`site-header.tsx:166`** — the negative logo margin pulls the lockup left to sit under the hamburger. The lockup is a **raster PNG with baked-in directionality** (`/brand/primex-lockup.png`); it must NOT be flipped. Converting the margin to `-ms-` is correct, but check the result visually at 375px, 768px and 1440px — the overhang was tuned against a left-side hamburger and may need a different value in RTL. Do not `scaleX(-1)` the image.

**`search-content.tsx:87`** and the `-translate-x-1/2` centring patterns — `left-1/2 -translate-x-1/2` centring is direction-neutral and works as-is. Leave it.

### Explicitly out of scope

- Everything under `app/admin/**` — staff-facing, English-only.
- `components/ui/**` (shadcn primitives) — these already use `data-[side=inline-start]` variants and handle their own RTL. Do not hand-edit them. If a primitive misbehaves in RTL, fix it at the call site.

### Icons that need flipping

Directional icons do not mirror with `dir`. Flip these with `rtl:scale-x-[-1]` (or a `[dir="rtl"] &` rule):

- `ArrowLeft` — the Back control in `StickyTotal` (`join-funnel.tsx`) and the desktop control row, and `CheckoutHeader`'s back arrow
- `ChevronRight` — `StickyTotal`'s Continue, all "see all" rail cards, pricing accordion rows, `dropdown-menu.tsx:122`
- Any `→` character in copy (`SectionHeader`'s action link renders a literal `→`) — becomes `←` in Arabic. Handle in the translation string, not with CSS.

Do **not** flip: the WhatsApp glyph, social icons, the padlock, `Check`, the clock, the map pin, the brand lockup.

---

## Screen spec: `1c` Arabic checkout

Mirrors step 1 of the join funnel. Everything below is at 375px.

**Frame:** `#121414` ground, `1px solid #333535` border, industrial grain overlay.

**Checkout header** — 56px tall, `#0f1111`, `1px solid #333535` bottom border.
- Back arrow: 48×48 hit area, `#c8c6c5`, `scaleX(-1)` applied, at the inline-start (right in RTL).
- Title "انضم إلى برايم إكس" — Noto Kufi 800, 16px, `#ffffff`.
- Trailing lock + "آمن": padlock 13px `#25D366`, label 12px 600 `#c8c6c5`, `margin-inline-start: auto`.

**Progress** — `#0f1111`, 14px top padding.
- "الخطوة ١ من ٣ · الخطة والبداية" — 12px 600 `#ffffff`.
- "دقيقتان" — 12px `#616564`, at the inline-end.
- Three segments, 3px tall, 3px gap: first `#d12028`, rest `#333535`.

**Term grid** — 2×2, `1px` gaps rendered as `#333535` background showing through, outer `1px solid #333535`.
- Cell: min-height 62px (2px taller than the English 60px — Arabic ascenders/descenders need it), padding 12px 14px.
- Inactive: `#0f1111`, label 13px 600 `#c8c6c5`, sub-label 12px.
- Sub-label colour: `#616564` for "السعر الكامل", `#ffb4a8` for a saving.
- Active (سنة كاملة): `#d12028` ground, both lines `#fff7f5`, sub-label 600.

**Tier cards:**
- Selected (إيليت): `2px solid #d12028`, `#1a1c1c` ground, 16px padding.
  - "الأكثر اختيارًا" badge: `#d12028`, 4px 8px, 12px 600 `#fff7f5`, pinned `inset-inline-end: 0; top: 0` — **mirrors to the left edge in RTL.**
  - Radio: 18px, `5px solid #d12028`, white centre.
  - Name 20px 800 `#ffffff`; primary line 14px `#ffffff`; secondary 13px `#c8c6c5`, both `line-height: 1.6` (looser than the Latin 1.45 — Arabic needs it).
  - Price row: `1px solid #333535` top border, 12px padding-top. Figure `1,898` at 26px 900 **Latin, `dir="ltr"`, tabular-nums**; unit "جنيه / شهر" 12px `#c8c6c5`; total "الإجمالي ٢٢٬٧٨٠" 13px `#c8c6c5` at `margin-inline-start: auto`.
- Unselected (برو، كور): `1px solid #333535`, `#0f1111`, min-height 66px, radio `1px solid #616564`. Name 17px 800; detail 13px `#c8c6c5`. Price 20px Latin `dir="ltr"`, unit 12px, block aligned `text-align: start`.

**Start date** — `1px solid #333535` top border, 20px padding-top. Label "موعد البداية" 12px 600 `#c8c6c5`. Three equal buttons, 14px 10px padding, 13px 600: active `#222424`/`#ffffff`, rest `#0f1111`/`#c8c6c5`.

**Sticky total bar** — `position: fixed`, `#1a1c1c`, `2px solid #d12028` top border, `padding-bottom: env(safe-area-inset-bottom)`.
- "الإجمالي اليوم" 12px 600 `#c8c6c5`.
- "EGP 22,780" — 23px 900, **Latin, `dir="ltr"`** (1px smaller than the English 24px; the Arabic label above is wider and 24px overflows at 375px).
- "شامل الضريبة" 12px `#616564`.
- Button "متابعة": `#d12028`, min-height 52px, 0 22px padding, 14px 600 `#fff7f5`, `margin-inline-start: auto`, chevron `scaleX(-1)`.

### Arabic copy

Reference translations, all in `1c`. **Have a native Egyptian Arabic speaker review before shipping** — these are reasonable but unreviewed, and tier names are transliterations that the gym may prefer to leave in Latin script.

| English | Arabic |
|---|---|
| Join PrimeX | انضم إلى برايم إكس |
| Secure | آمن |
| Step 1 of 3 · Plan & start | الخطوة ١ من ٣ · الخطة والبداية |
| 2 min | دقيقتان |
| How long for | مدة الاشتراك |
| 1 Month / 3 Months / 6 Months / 1 Year | شهر واحد / ٣ أشهر / ٦ أشهر / سنة كاملة |
| Full price | السعر الكامل |
| Save 10% / 16% / 27% | خصم ١٠٪ / ١٦٪ / ٢٧٪ |
| best | الأفضل |
| Which tier | اختر الفئة |
| Popular | الأكثر اختيارًا |
| Elite / Pro / Core | إيليت / برو / كور |
| Unlimited sessions, every day | حصص غير محدودة، كل يوم |
| Gym + fitness · 2 guest invites · 1 month freeze | جيم + فتنس · دعوتان لضيوف · تجميد شهر |
| 20 sessions · 5 days a week | ٢٠ حصة · ٥ أيام أسبوعيًا |
| 12 sessions · 3 days a week | ١٢ حصة · ٣ أيام أسبوعيًا |
| EGP / month | جنيه / شهر |
| total | الإجمالي |
| When you start | موعد البداية |
| Today / 1 Oct / Pick date | اليوم / ١ أكتوبر / تاريخ آخر |
| Total today | الإجمالي اليوم |
| incl. VAT | شامل الضريبة |
| Continue | متابعة |

Not yet translated — needed for steps 2 and 3, the homepage and the account area: all form labels, the three review-step promises, "Secured by Paymob · 3-D Secure", error strings in `apiErrorMessage`, and every `sr-only` string including the page `<h1>` in `join/page.tsx`.

---

## Behaviour & state

- **Locale is a route segment**, not client state. No locale in `localStorage`, no client-side redirect on load — both break SSR and caching.
- **`useIdempotencyKey`, the quote query and the Paymob redirect are unchanged.** Arabic is presentation. Do not touch `startJoin` / `previewJoin` payloads.
- **Paymob's hosted page has its own locale.** Pass the locale through to the gateway so an Arabic user doesn't land on an English payment page. Check what `startJoin` currently sends and whether the backend forwards a locale hint — this is a backend coordination point.
- **Dates.** `formatMembershipDate` / `formatMembershipDateShort` / `shortMonthLabel` in `lib/gym-format.ts` hardcode `en-GB` and `en-CA`. `en-CA` in `nextMonthIso()` is load-bearing — it yields `YYYY-MM-DD` for the date input and **must not** become locale-aware. The display formatters must. Keep the two uses clearly separated; this is an easy bug to introduce.
- **`formatPrice` / `formatAmount`** in `lib/format.ts` need a locale parameter, defaulting to current behaviour.
- **The `.rail` component** (`globals.css:848–912`) uses logical properties and its scroll-padding comment warns it must match the markup's inline padding. Snap rails scroll right-to-left in RTL natively. Test that the "see all" trailing card lands at the correct end and that the initial scroll position is at the start (rightmost) — some browsers get `scrollLeft` initialisation wrong in RTL.
- **`step-enter` animation** (`globals.css:781–800`) translates on X by direction. In RTL the forward/back slide directions must swap, or moving forward animates backward.

---

## Design tokens

Unchanged from the existing system — Arabic introduces no new colours.

```
--background        #121414    ground
--surface-1         #0f1111    recessed panel
--surface-2         #1a1c1c    raised panel
--surface-3         #222424    active/selected
--border            #333535
--concrete          #474746    hairline on dark
--muted-foreground  #c8c6c5    body text
                    #616564    tertiary / disabled
--foreground        #ffffff
--primary           #d12028    the only loud colour
--primary-foreground #fff7f5
--primary-soft      #ffb4a8    small red text, 9.4:1
WhatsApp green      #25D366
```

Border radius: **0 everywhere.** Non-negotiable in this system.

Type scale (Arabic): display 800/900 Noto Kufi at 32/26/23/20/17px; body 14/13px at `line-height: 1.6`; labels 12px 600, `letter-spacing: normal`.

Touch targets: 44px minimum, 48–52px for primary actions.

---

## Testing

- Chrome and Safari on iOS at 375px — Safari's RTL `position: fixed` and `env(safe-area-inset-*)` handling differs from Chrome's, and `StickyTotal` uses both.
- Confirm `StickyTotal` and `FloatingContact` still never collide. `FloatingContact` is suppressed on `/join` by `HideOnCheckout` (`checkout-chrome.tsx`), which exact-matches the path string `"/join"` — **adding a `/ar/join` route will silently break this.** `isCheckout` must match both, or the WhatsApp bar reappears on top of the Arabic Pay button. This is the single highest-risk regression in the task.
- Mixed-direction strings: an Arabic name beside a Latin price, an Arabic address with a Latin street number, a phone number in an Arabic sentence.
- Check no Arabic text renders with letter-spacing (glyphs visibly disconnected).
- Screen reader in Arabic: verify `lang`/`dir` are announced and the `sr-only` `<h1>` reads correctly.

---

## Suggested order

1. `next-intl` + `[locale]` routing + `lang`/`dir` on `<html>`. Ship with `ar` serving English strings — proves the plumbing without translation risk.
2. Font loading + the global RTL type reset. Visual-only, immediately reviewable.
3. Physical-property conversion (table above) + icon flips. Verify LTR is unchanged — logical properties are identical in LTR, so any English regression here is a mistake, not a trade-off.
4. `messages/ar.json` for chrome, starting with the join funnel.
5. CMS Arabic fields + `getContentServer(locale)`. **Backend dependency — start the conversation at step 1, not step 5.**
6. Locale switcher, `hreflang`, canonicals.
7. Native-speaker copy review.

Steps 1–4 are frontend-only and independently shippable. Step 5 is the one that can block a launch date.

---

## Open questions — resolve before building

1. **Numerals.** `1c` uses Arabic-Indic in prose (٣ أشهر، خصم ٢٧٪) and Latin for currency (EGP 22,780). This mix is common on Egyptian sites but is a real choice with a consistency cost. Confirm with the gym. If they want Latin throughout, it is a smaller job — drop the Arabic-Indic strings and keep `dir="ltr"` only on currency.
2. **Tier names.** `1c` transliterates Elite/Pro/Core as إيليت/برو/كور. Many Egyptian gyms keep tier names in Latin script as brand terms. Ask. Note these come from the **API** (`plan.tier ?? plan.name`), not from translation files — if they are translated, the backend needs Arabic plan fields, which folds into the step-5 CMS work.
3. **Scope of `/account`.** Assumed in scope. Confirm.
4. **Floating WhatsApp button** — mirror or pin right? See the judgement-call section.
5. **Paymob locale.** Does the gateway account support an Arabic hosted page, and does the backend forward a locale?

---

## Appendix A — already shipped, do not redo

Both earlier redesigns are merged and verified against the codebase as of this handoff. Treat them as the current baseline.

**Mobile homepage** — `components/public/rail.tsx` (snap rail, becomes a grid at `lg`), `SectionHeader` with `shortLabel` and body copy dropped below `md`, `app/page.tsx` using `Rail` for classes and trainers with `.slice(0, 4)`, `site-header.tsx` at `h-15` (60px) on mobile, `cards.tsx` with a `preview` variant.

**Join checkout** — `join-funnel.tsx` at three steps, `StickyTotal` fixed bar, one-line `Progress`, per-month-headline pricing, card scheme marks, three trust promises, `sr-only` `Fieldset` legend, `OrderSummary` with an `Edit` affordance, and `checkout-chrome.tsx` suppressing the site shell on `/join`.

### Two outstanding defects, unrelated to Arabic

**1. `StickyTotal` probably wraps its total on steps 2 and 3 at 375px.** Found while checking the design file, where the identical geometry demonstrably fails.

In `join-funnel.tsx`, `StickyTotal` renders `formatPrice(total)` in a `font-display text-2xl` (24px) span inside a `<p className="flex items-baseline gap-2">`. The span has default `flex-shrink: 1` and no `white-space: nowrap`, so it can shrink below its content width and break at the space — "EGP 22,780" becomes "EGP" / "22,780" and the bar doubles in height.

It only bites once the row is crowded. On step 1 there is no Back button and it fits; from step 2 the `size-12` back button plus the `ms-auto` action button leave roughly 136px for a figure that needs about 139px.

Fix:

```tsx
<span
  key={total}
  className="fade-in shrink-0 font-display text-[22px] leading-none whitespace-nowrap text-foreground tabular-nums"
>
  {formatPrice(total)}
</span>
```

`whitespace-nowrap` and `shrink-0` are the correctness fix; dropping 24px → 22px buys the ~12px needed to avoid overflowing instead of wrapping. Verify on a real 375px device, not just a resized desktop window.

**This matters more than its size suggests** — keeping that number on screen at the moment of the tap is the reason the sticky bar exists. Check it before the Arabic work, because Arabic makes it worse: the label "الإجمالي اليوم" is wider than "Total today", which is why the Arabic reference already drops the figure to 23px.

**2. Duplicate import.** `join-funnel.tsx` imports from `@/lib/gym-format` twice (line 12 `formatDuration`, line 15 `formatMembershipDate`). Merge into one — `import/no-duplicates` will flag it.

## Appendix B — files in this bundle

- `PrimeX Redesign.dc.html` — design reference. Section `1c` is the Arabic screen; `1a`/`1b` are the shipped English screens for comparison.
- `PrimeX Current UI.dc.html` — the pre-redesign baseline, for context only. Nothing here should be built.
- `assets/` — brand lockup and photography used by both files. The photography is placeholder; real PrimeX photography is expected.

Open the HTML files directly in a browser. No build step, no server.
