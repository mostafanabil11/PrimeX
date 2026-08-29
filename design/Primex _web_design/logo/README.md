# Logo

`final logo.png` is the master: 981×528 RGBA, transparent ground, type in pure
white, bolt in the brand red. Everything the site shows is derived from it.

| File | What it is |
|---|---|
| `final logo.png` | **The master.** Do not edit in place — replace it. |
| `DESIGN.md` | The palette and type spec the original concept shipped with. |

## How it reaches the site

`Frontend/scripts/generate-logo-assets.mjs` reads this file and writes
`Frontend/public/brand/primex-lockup.png`. It does one thing: trims the 20px of
transparent padding the master carries on every side, which otherwise becomes
part of the box the browser lays out, leaving the mark floating inside its own
container and aligned to nothing.

```bash
cd Frontend && node scripts/generate-logo-assets.mjs
```

Run that after replacing the master. Do not hand-edit the PNG in `public/` —
it is generated, and a manual edit will be silently overwritten.

The script also re-encodes with PNG Sub filtering, which takes the file from
365 KB to 138 KB losslessly. It is written against `node:zlib` alone, so it
needs no image library and runs anywhere node does.

## Notes

**The type is baked in as white pixels**, so the lockup only works on a dark
ground. The site has one theme and it is dark, so that is fine — but a
light-background placement (print, a letterhead, a partner's site) needs its own
export from the master rather than a CSS filter.

**The strapline stays on at every size.** In the header the lockup renders about
80px tall, which puts "Commit to be fit" at roughly 3px. A variant with it
erased was built and then dropped: the strapline is part of the lockup, and the
brand is shown whole rather than quietly edited to suit a layout.

**The favicon is deliberately different.** `Frontend/src/app/icon.svg` and
`Frontend/scripts/generate-icons.mjs` draw a single chunky bolt, because the
lockup's long thin barbs disappear entirely at 16px.

## History

Two things used to live here and are gone:

- `screen.png` — the AI-generated concept this project started from, on a navy
  field. Superseded by the master.
- `primex-lockup-trace.svg` — a hand trace of the mark, used while there was no
  real asset. It was close and it was not right: the word was set in Anybody
  rather than the logo's own typeface, and the barbs were drawn as straight
  cuts. A logo that is almost right is worse than one that is right.
