# Handoff: PrimeX Site Navbar (option 1A)

## Overview
Redesign of the PrimeX global site header. The existing header was very tall (~160px) with a large logo and a lot of dead space; the redesign shrinks the main bar, moves utility information into a thin strip above it, and adds search + account + CTA on the right so the bar reads dense and intentional.

Deliver **option 1A**. Options 1B and 1C are included in the same file as rejected alternatives — ignore them unless asked.

## About the Design Files
The files in this bundle are **design references created in HTML** — prototypes showing intended look and behavior, not production code to copy directly. Recreate the design in the target codebase's existing environment (React/Next, Vue, etc.) using its established components, styling approach, and routing. If there is no established environment yet, pick the most appropriate framework and implement it there.

The HTML uses a custom streaming component runtime (`support.js`, `<x-dc>`, `<sc-if>`); that runtime is an authoring tool, **not** part of the design. Read the markup and inline styles, ignore the runtime.

## Fidelity
**High-fidelity.** Colors, type sizes, letter-spacing, and spacing are final. Recreate pixel-accurately, but swap the fonts/tokens for the codebase's equivalents if they already exist.

## Screens / Views

### Global Navbar — option 1A
**Purpose:** primary site navigation, present on every page including the admin dashboard.

**Structure:** one container, `background #0a0a0a`, `border: 1px solid rgba(255,255,255,0.07)` (in production the outer border is likely just a `border-bottom`). Two stacked rows.

#### Row 1 — utility strip (optional, toggleable)
- Height **38px**, `background #000`, `border-bottom: 1px solid rgba(255,255,255,0.07)`, padding `0 28px`.
- `display:flex; align-items:center; justify-content:space-between`.
- Type: **11px**, letter-spacing **1.6px**, color `#8a8c8f`, uppercase, monospace.
- Left group (`gap: 22px`): `NASR CITY` ◆ `ZAMALEK` ◆ `6TH OCTOBER`. The ◆ separators are `#e01b22`.
- Right group (`gap: 26px`): `OPEN 24/7` (color `#e8e8e8`), `+20 100 555 0110`, links `INSTAGRAM`, `WHATSAPP`.
- Hidden entirely when the `showTopStrip` flag is false.

#### Row 2 — main bar
- Height **96px**, `background #0d0d0d`, padding `0 28px`, `display:flex; align-items:center; justify-content:space-between`.

**Left cluster** (`display:flex; align-items:center; gap:20px`):
1. Logo `<img>`, **height 104px**, width auto, `margin: -14px 0` so it overhangs the 96px bar top and bottom. Links to home.
2. Vertical divider: `width:1px; height:44px; background rgba(255,255,255,0.14)`.
3. Two-line lockup, `flex-direction:column; gap:6px`:
   - Line 1: 6px red dot (`#e01b22`, `border-radius:50%`) + `ADMIN CONSOLE` — 11px, weight 700, letter-spacing 2.2px, `#fff`.
   - Line 2: `NASR CITY BRANCH` — 10px, letter-spacing 1.8px, `#7d7f82`.
   - This lockup is context-dependent: on the public site it can be swapped for the branch/hours, on admin it names the console and branch. It exists to balance the bar's left side — do not delete it.

**Center nav** (`display:flex; gap:30px; align-items:center`): `HOME  ABOUT  MEMBERSHIP  CLASSES  TRAINING  CONTACT`
- 12px, letter-spacing 1.7px, uppercase.
- Inactive: `#b9bbbe`. Hover: `#e01b22`.
- Active: `#fff` with `padding-bottom:4px; border-bottom:2px solid #e01b22`.

**Right cluster** (`display:flex; align-items:center; gap:16px`):
1. Search button — 34px square, `border:1px solid rgba(255,255,255,0.18)`, magnifier glyph `#cfd1d4`; hover border `#e01b22`. (Use the codebase's icon set rather than the CSS-drawn glyph in the prototype.)
2. Account chip — `padding-right:16px; border-right:1px solid rgba(255,255,255,0.12)`, `gap:9px`: 30px circular avatar (`background #1c1c1c`, `border:1px solid #e01b22`, initial `P` at 12px `#fff`) + member name at 11px, letter-spacing 1.4px, `#e8e8e8`.
3. CTA — `background #e01b22`, `color #fff`, 12px, weight 700, letter-spacing 2px, `padding:12px 22px`, square corners. Hover `#ff2a32`.

## Interactions & Behavior
- Nav links navigate; active route gets the white + 2px red underline treatment.
- All links transition color to `#e01b22` on hover; CTA transitions background to `#ff2a32`. Use a short transition (~120–150ms ease).
- Search button opens the site search (behavior not designed here — reuse whatever the app has).
- Account chip is the entry point to the account/admin menu; the prototype does not design the dropdown.
- Utility strip visibility is a prop, not a user setting.
- Responsive behavior is **not designed**. Below ~1200px the center nav will not fit; expect to collapse it to a hamburger and drop the utility strip and the ADMIN CONSOLE lockup. Confirm with design before shipping a mobile treatment.
- No loading, error, or form states in this design.

## State Management
Minimal: `activeRoute` (drives the underline), `memberName` / signed-in user, `showTopStrip` flag, and whatever the search and account menus need (`searchOpen`, `menuOpen`).

## Design Tokens
Colors
- Page/strip black: `#000000`
- Navbar shell: `#0a0a0a`
- Main bar surface: `#0d0d0d`
- Avatar surface: `#1c1c1c`
- Brand red: `#e01b22`; hover red: `#ff2a32`
- Text primary: `#ffffff`; secondary: `#e8e8e8`; nav idle: `#b9bbbe`; muted: `#8a8c8f`; dimmest: `#7d7f82`; icon: `#cfd1d4`
- Hairlines: `rgba(255,255,255,0.07)` (row borders), `rgba(255,255,255,0.12)` / `rgba(255,255,255,0.14)` (dividers), `rgba(255,255,255,0.18)` (button border)

Typography — monospace throughout (prototype uses **Space Mono**; match the existing site face, which is a letter-spaced mono/tech style)
- Nav link: 12px / ls 1.7px / uppercase
- Utility strip: 11px / ls 1.6px
- CTA: 12px / 700 / ls 2px
- Account name: 11px / ls 1.4px
- Lockup line 1: 11px / 700 / ls 2.2px · line 2: 10px / ls 1.8px

Spacing: 6 · 9 · 16 · 20 · 22 · 26 · 28 · 30 px. Heights: strip 38px, bar 96px, logo 104px.
Radius: 0 everywhere except circles (avatar, dot).
Shadows: none.

## Assets
- `final logo.png` — the PrimeX wordmark + bolt, supplied by the user (white wordmark on transparency; works on dark only). Use the vector original in production if one exists.
- Icons (search, notification) are CSS-drawn placeholders in the prototype — replace with the codebase's icon library.

## Files
- `PrimeX Navbar.dc.html` — the design. Option **1A** is the one to build (`id="1a"`); 1B and 1C are alternates.
- `support.js` — authoring runtime, reference only.
- `final logo.png` — logo asset.
