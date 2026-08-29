# What the biggest gym sites do

Reviewed August 2026. The point of this is not to copy anyone — PrimeX has a
stronger visual identity than most of these — but to know which of our choices
are deliberate and which are accidental.

## Who was looked at

| Chain | Scale | Positioning | Read directly? |
|---|---|---|---|
| Equinox | 115+ clubs | Luxury | ✅ |
| Third Space | 16 clubs, London | Luxury | ✅ |
| Gold's Gym Egypt | Local + global brand | Mid/premium | ✅ |
| GymNation | GCC | Value, 24/7 | ✅ |
| Basic-Fit | 230+ in Belgium alone | Value | ✅ |
| Planet Fitness | 2,731 US clubs, 20.8M members | Value | ❌ blocked (403) |
| Life Time / PureGym | Large | Premium / value | ❌ fetch errors |

Planet Fitness and PureGym figures below come from industry reporting rather
than from reading their sites.

## The finding that matters: pricing splits by positioning

This was almost perfectly consistent, and it is the single biggest strategic
question for PrimeX.

**Premium brands gate pricing completely.** Equinox, Third Space and Gold's Gym
Egypt show *no* rates anywhere on the site. Not a "from" price, not a range.
They sell the experience, capture a lead, and quote privately. Equinox's entire
homepage runs on "It's Not Fitness. It's Life." and a Join button that leads to
a form, never a number.

**Value brands lead with the number.** Basic-Fit puts three tiers with exact
prices (€24,99 / €29,99 / €34,99 per four weeks) directly on the homepage. The
price *is* the pitch.

**PrimeX currently does the value thing with premium styling.** We publish four
tiers across four terms plus a full comparison grid. That is Basic-Fit
behaviour wearing Equinox clothes.

That is not automatically wrong — see the recommendation below — but it should
be a decision rather than a leftover.

## The shared homepage skeleton

Every site reviewed follows close to the same order:

1. Hero — one short declarative line, plus **two** CTAs: one to join, one to
   explore ("Find your club", "Visit a club")
2. Proof of scale or heritage — "115+ clubs", "since 1965"
3. The core value proposition, stated once and plainly
4. Classes, as a carousel or grid
5. Facilities / training zones
6. **Personal training as its own pillar** — all of them, without exception
7. Social proof / testimonials
8. Repeated CTA before the footer

PrimeX already has 1, 3, 4, 5, 7 and 8. Two gaps:

- **No proof of scale.** Ours is a single gym, so "115+ clubs" is not available
  — but the equivalent exists: equipment, hours, coach credentials, the two
  floors. The Facility page is where that belongs.
- **Personal training is not a pillar.** Every chain reviewed treats PT as a
  distinct revenue line with its own section and its own CTA. Ours is currently
  a trainer directory with no booking path. Phase B addresses this, and this
  review raises its priority.

## Regional lessons

**GymNation (GCC) is the most relevant comparison we have** — same region, same
WhatsApp-first reality:

- WhatsApp is a first-class contact channel, with pre-populated messages. ✅ we
  already do this, and it is a genuine strength.
- **Arabic/English toggle.** We are English-only. `globals.css` notes the app
  was written with logical properties specifically so Arabic becomes "a
  translation job rather than a re-layout" — the groundwork exists, unused.
- The hook is a **free day pass**, not a discount. Low commitment, gets people
  through the door, then the tour sells.
- **Referral is gamified**: "give your friends a free day pass and win prizes".
  We already store a `referralCode` on every member and show it in account
  settings — but nothing anywhere promotes it. That is a built feature doing
  nothing.

**Gold's Gym Egypt** — the direct local competitor — leads on heritage (1965,
Venice Beach, Joe Weider) because it is the one asset it has that we cannot
copy. Its site gates pricing, has no WhatsApp integration, and its primary CTA
is "find your nearest club". For a single-site gym, our WhatsApp reservation
flow is a real advantage over them.

## Offers and urgency

Every value and premium brand runs a dated, specific offer:

- Equinox: "Two weeks on us + $0 initiation", ends 8.31
- Basic-Fit: 5 free weeks + a sports bag, valid 21/08–08/10

Both are **time-bound and concrete**. Our announcement bar carries permanent
claims ("Open 24/7", "Certified Coaches") — true, but not a reason to act
today. The backend already has a full `offers` module with live-offer pricing
resolution wired into the join flow. Like referrals, it is built and idle.

## Recommendations, in priority order

1. **Photography.** Every one of these sites is carried by its imagery —
   Equinox and Third Space are essentially photo galleries with type over them.
   Ours are all placeholders from the previous brand, currently desaturated to
   hide a colour clash. This is the highest-impact item on the whole project
   and nothing else comes close.
2. **Decide the pricing posture deliberately.** Options: keep full transparency
   (differentiates us from Gold's Gym Egypt, filters time-wasters, suits a
   WhatsApp market where people ask anyway), or move to "from EGP X" with the
   detail behind the join flow. Either is defensible; drifting is not.
3. **Make personal training a pillar**, not a directory. This is Phase B and
   every competitor validates it.
4. **Turn on one dated offer.** The module exists. A specific, expiring offer is
   the one thing every competitor has that we do not.
5. **Promote the referral code.** Already built, already stored, invisible.
6. **Arabic.** Not small, but the architecture was deliberately prepared for it
   and the local competition offers it.

## What we do better

Worth stating, so it does not get designed away:

- **WhatsApp-first reservation** that creates a real record before the
  conversation starts. Gold's Gym Egypt has nothing like it.
- **A stronger visual identity.** Equinox and Third Space are deliberately
  neutral — imagery does all the work. PrimeX has an actual design language.
  That is an asset as long as the photography rises to meet it.
