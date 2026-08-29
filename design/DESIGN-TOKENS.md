# PrimeX — design tokens

The implemented system, as it stands in `Frontend/src/app/globals.css`. That
file is the source of truth; this page is the map.

Source design: `Primex _web_design/` ("Voltage Industrial"), neutral-background
variant. The palette below is lifted from that folder's generated `code.html`
rather than sampled from the screenshots, so the values are exact.

Two earlier explorations used to sit alongside it — the original Titan
Performance comps in acid lime, and an "Obsidian Crimson" recolour that was
considered and not chosen. Both have been deleted, because a folder of
superseded palettes next to the live one is an invitation to pick a colour out
of the wrong set. Anything worth keeping from them is recorded below.

## Colour — dark only

There is no light theme and no toggle. Tokens live on `:root`; the `.dark`
block is kept byte-identical to it and exists only so the ~29 `dark:` variants
inherited from shadcn resolve (see the note in `layout.tsx` — the `dark` class
on `<html>` is what makes them apply at all).

| Role | Token | Hex | Notes |
|---|---|---|---|
| page | `--background` | `#121414` | near-black, neutral |
| surface 1 | `--surface-1` | `#0f1111` | recessed: footer, sidebars |
| surface 2 | `--surface-2` / `--card` | `#1a1c1c` | cards, panels |
| surface 3 | `--surface-3` | `#222424` | raised / hover |
| text | `--foreground` | `#ffffff` | pure white, headings |
| body text | `--muted-foreground` | `#c8c6c5` | running copy |
| brand | `--primary` | `#e60000` | fills, large type, rules |
| on brand | `--primary-foreground` | `#fff7f5` | text on red |
| soft brand | `--primary-soft` | `#ffb4a8` | **small** red-ish text |
| concrete | `--concrete` | `#474746` | visible mid-grey borders |
| border | `--border` | `#333535` | structural hairlines |

### The two rules that matter

1. **The foreground is pure white**, not the comp's warm `#ffdad4`. That warm
   off-white was tried and dropped: at real sizes it read dusty rather than
   warm, and cost more in crispness than it returned in family resemblance.
   `#fff7f5` is the halfway house if warmth is ever wanted back.

2. **Red has a size threshold.** `#e60000` on `#121414` measures **3.9:1** — it
   clears the 3:1 bar for large text and is fine for fills, but it **fails**
   4.5:1 for body text. Anything under ~24px that wants to look red uses
   `--primary-soft` (`#ffb4a8`, 9.4:1). Rule of thumb: *red for fills and 24px+,
   soft for anything smaller.*

## Type

Three faces, three jobs.

| Role | Family | Utility | Notes |
|---|---|---|---|
| Headlines | **Anybody** | `font-display` / `font-heading` | 800–900, **italic**, negative tracking |
| Body | **Hanken Grotesk** | default | 400–600 |
| Labels | **JetBrains Mono** | `font-mono` | eyebrows, buttons, stats, codes |

- The **italic is the brand**, not emphasis. It is set once in the
  `.font-display` base rule rather than at ~150 call sites.
- Anybody exposes **no `slnt` axis**, so `font-style: oblique <angle>` is
  silently ignored and renders upright. It must be `font-style: italic`, with
  the italic cut loaded in `layout.tsx`. This was a real bug during the port.
- Anybody at 800+ needs **negative** tracking (−0.02 to −0.04em). The previous
  face, Bebas, needed positive — every `tracking-*` next to a `font-display`
  was retuned when the faces swapped.
- Monospace labels want **open** tracking (0.1–0.16em). The scale flips sign
  halfway down for exactly this reason.

## Shape, depth, motion

- **Radius is `0px`.** Buttons, inputs, cards, images — all 90°. This is not a
  taste call; rounding reads as a different brand. Small dots and count badges
  stay circular, being dots rather than containers.
- **No shadows.** Depth is tonal layering plus 1–2px visible outlines.
- Section headings carry a short red rule (`.rule-accent`).
- `.industrial-grain` washes the body; `.lightning-cut` is the 45° bolt corner,
  used sparingly.
- Motion animates only `transform` and `opacity`, never layout.

## Photography

High-contrast and near-monochrome — `grayscale(0.85) contrast(1.1)`, applied
once to `[data-photo]`. Red stays the only saturated thing on the page.

This is doing double duty right now: every photograph on the site was shot for
the previous brand and is lit acid-green, which against `#e60000` is a direct
red/green clash. Desaturation removes the fight, so the placeholders sit quietly
until real PrimeX photography replaces them. Keep the treatment when it does.

The hero repeats these values as utilities rather than inheriting the rule,
because `priority` images are deliberately not tagged `data-photo` (a faded
element does not count as painted, which would push out LCP). Keep the two in
step.

## Still to do

- Real photography; the current images are placeholders from the old brand.
- `public/brand/og.jpg` — the share card is an old gym photo with lime accents.
- The official logo files. The header/footer wordmark and the bolt favicon are
  drawn in code (`components/layout/wordmark.tsx`, `app/icon.svg`,
  `scripts/generate-icons.mjs`) as stand-ins.
- Mobile layouts were never designed in any comp; the build is responsive but
  unverified against a design.
