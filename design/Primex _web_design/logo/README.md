# Logo

## What is here

| File | What it is |
|---|---|
| `primex-lockup-trace.svg` | Vector trace of the master. This is the shape the site renders. |
| `screen.png` | **Outdated.** The AI-generated concept this project started from, on a navy field. Superseded by the real logo and kept only until the master file replaces it. |
| `DESIGN.md` | The palette and type spec the concept came with. |

## What is missing

**The master file.** Whoever cut the illuminated sign in the gym will have it as
AI, EPS, PDF or SVG — sign makers need vector to drive the cutter, so it exists.
Ask the owner for it.

Drop it in here as `primex-lockup.svg` (or `.ai`/`.eps` alongside an SVG export)
and delete `screen.png`.

## Why the trace is not good enough long term

It is close, and it is better than a bitmap, but it is a redraw by eye from a
photograph and a flat export. Two things are known to be wrong:

- **The typeface.** The word is set in Anybody, the site's headline face. The
  logo's is wider and shorter — at matching cap height it runs roughly 10%
  wider than Anybody reaches without letter-spacing that would look sprung.
  Cap height is matched and the width left slightly narrow, because height is
  what the eye reads as "the right size".
- **The barb corners** are drawn as straight cuts. The original may carry small
  radii or a slightly different notch angle; neither can be resolved from a
  screenshot.

A logo that is *almost* right is worse than one that is right, so this should
not survive to launch.

## Where it is used

The app does not read this file. The lockup is a React component at
`Frontend/src/components/layout/wordmark.tsx`, so the word can be live text
that inherits the page font and the red can come from the `--primary` token.
This SVG mirrors it for design reference and standalone use.

The favicon is separate and deliberately different: `Frontend/src/app/icon.svg`
plus `Frontend/scripts/generate-icons.mjs` draw a single chunky bolt, because
the lockup's long thin barbs disappear entirely at 16px.
