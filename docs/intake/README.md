# Data intake

How the gym owner's information gets from WhatsApp into the database.

## The process

1. **You forward whatever he sends.** Screenshots, voice-note transcripts, a photo
   of a price list, Arabic, a mix — it does not need to be tidy and you should
   not retype it.
2. **I transcribe it into the templates here** and show you the result.
3. **You check it against what he actually sent.** This is the step that matters:
   a wrong price on the live pricing page is the expensive kind of mistake.
4. **I import it** into Mongo with a one-off script, and we look at the rendered
   pages together before calling it done.

Anything ambiguous, I ask rather than guess. "4,980" could be the total for three
months or the monthly rate on a three-month term, and those are very different
things to publish.

## The templates

| File | What | Notes |
|---|---|---|
| `plans.csv` | Tiers x terms with prices | 16 rows. Prices in whole EGP. |
| `trainers.csv` | One row per trainer | Bio, specialties, PT rate, photo filename |
| `trainer-availability.csv` | One row per trainer per working day | Maps 1:1 onto `Trainer.availability` |
| `floors.md` | The two floors | Hours, facilities, photos |

## What to ask him for

Checklist, so you get it in one round rather than three:

**Floors**
- [ ] Exact name of each floor as it should appear on the site
- [ ] Women's floor opening hours, per day of the week
- [ ] Whether the main floor is genuinely 24/7 including Friday
- [ ] Equipment list per floor
- [ ] Photos of each floor

**Trainers**
- [ ] Full name, and how they want it spelled in English
- [ ] Which floor / section they coach on
- [ ] Specialties, certifications, languages, years of experience
- [ ] A photo per trainer
- [ ] Personal training rate per hour, or confirmation they do not do PT
- [ ] **Availability: which days, and what hours on each day.** The single most
      commonly missed item. "Ahmed works mornings" is not enough — we need
      Sunday 09:00–14:00.

**Plans**
- [ ] Every tier at every term, with the price for each
- [ ] Whether the price quoted is the total for the term or per month
- [ ] Sessions included and days per week per tier
- [ ] What each tier includes that the one below does not
- [ ] Joining fee, if there is one, and whether any tier waives it
- [ ] Guest passes and freeze days per tier

## Images

You are adding these, not staff, so there is no uploader. Send the files and I
will place them in `Frontend/public/images/` and wire the paths.

Naming convention, so they stay findable:

- Floors: `floor-main-01.jpg`, `floor-women-01.jpg`
- Trainers: `trainer-<slug>.jpg`, e.g. `trainer-ahmed-hassan.jpg`
- Classes: `class-<slug>.jpg`

Landscape for floors, square-ish for trainer portraits. Anything above ~2000px
wide is wasted bytes — the site never renders them larger than that.

## Warning

`npm run seed:gym --fresh` **deletes** all branches, plans, trainers, class types
and testimonials. Once real data is in, that command is destructive. After
go-live: admin panel only.
