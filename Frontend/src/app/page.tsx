import type { Metadata } from "next";
import {
  getContentServer,
  getPlansServer,
  getBranchesServer,
  getTrainersServer,
  getClassTypesServer,
} from "@/lib/api/gym-server";
import { contentText, contentList } from "@/types/gym";
import { BRAND, siteUrl } from "@/lib/brand";
import { OrganizationSchema } from "@/components/public/structured-data";
import { Section, SectionHeader, CtaButton } from "@/components/public/section";
import { ExpandingCards } from "@/components/public/expanding-cards";
import { WhatsAppCta } from "@/components/public/whatsapp";
import { PricingGrid } from "@/components/public/pricing-grid";
import { formatPrice } from "@/lib/format";
import { getLocale, getTranslations } from "next-intl/server";
import { FollowUsSection, VisitUsSection } from "@/components/public/home-connect";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  const locale = await getLocale();
  const t = await getTranslations("Home");
  // One round of parallel fetches rather than a waterfall — every section is
  // independent, and awaiting them in sequence would add up to a slow page for
  // no reason.
  const [content, plans, branches, trainers, classTypes] = await Promise.all([
    getContentServer(locale === "ar" ? "ar" : "en"),
    getPlansServer(),
    // Shared by structured data and the homepage's Visit Us section.
    getBranchesServer(),
    getTrainersServer(),
    getClassTypesServer(),
  ]);

  // Show the highlighted plans if any are marked, otherwise the first three, so
  // the section is never empty just because nobody set the flag.
  const whyUs = contentList(content, "about.whyUs.items");
  const branch = branches[0] ?? null;

  // The cheapest way in, for the hero's second button.
  //
  // Month-to-month rather than the lowest number on the price list: the annual
  // tiers are cheaper PER MONTH but cost more to walk in with, and a button
  // reading "from EGP 1,025" that turns into a 12,300 charge is a bait. The
  // effective price, not the list price, so a live offer is reflected the
  // moment it is switched on.
  //
  // Falls back to the cheapest plan at any term if the gym ever stops selling
  // a monthly, and the button falls back to its old label if there are no
  // plans at all — see the hero.
  const monthly = plans.filter((p) => p.durationUnit === "month" && p.durationValue === 1);
  const entryPool = monthly.length > 0 ? monthly : plans;
  const entryPrice =
    entryPool.length > 0
      ? Math.min(
          ...entryPool.map((p) => p.pricing?.effectivePriceMinorUnits ?? p.priceMinorUnits),
        )
      : null;

  return (
    <>
      <OrganizationSchema
        name={BRAND.name}
        description={BRAND.description}
        siteUrl={siteUrl()}
        logoUrl={`${siteUrl()}/brand/icon-512.png`}
        branches={branches}
      />

      {/* Hero
          ------------------------------------------------------------------
          TWO LAYOUTS, AND THE PHONE ONE IS NOT THE DESKTOP ONE STACKED.

          Above lg the copy sits beside the photograph and always has. Laying
          it over cannot work at that size: the frame carries hard specular
          highlights, so holding 4.5:1 for the muted subheading needs a scrim
          around 85% — and this photograph averages only 33/255 against a
          22/255 page, so a scrim that heavy erases it completely.

          Below lg the redesign solves the same problem a third way, and it is
          better than either: a short photo BAND with the copy on a solid panel
          overlapping its bottom edge by 24px. The photograph keeps full
          strength because nothing is written on it, the copy keeps a real
          ground because it is on the page colour, and the overlap is what
          stops the two reading as a picture with a caption underneath.

          The band is 206px. The old value was 320 and the picture won
          outright: the eyebrow started around 535px and the two CTAs at 779
          and 842, both past the fold on a 375x812 phone before the browser's
          own chrome was counted. With the utility strip and the marquee now
          gone from the header as well, the headline and BOTH buttons land
          inside the first screen — which is the entire point of the exercise.
      */}
      <section className="w-full border-b border-border">
        <div className="mx-auto grid w-full max-w-(--spacing-container-max) grid-cols-1 items-stretch lg:grid-cols-2">
          {/* A tall, immersive hero rather than a band above the copy.

              Sized in svh, not vh: on a phone vh is the viewport WITHOUT the
              browser chrome, so a 70vh hero is taller than the screen actually
              shows and the copy below it starts further down than intended.
              svh is the small viewport — the height with the address bar
              visible — which is the state the page first paints in.

              78svh deliberately leaves about a fifth of the screen for the
              eyebrow and the start of the headline. A full-height hero would
              be a wall of video with nothing indicating there is a page under
              it; this shows enough to read as the top of something. The
              min/max keep it sane on a short landscape phone and on a very
              tall desktop window. */}
          <div className="relative order-first h-[78svh] max-h-[760px] min-h-[460px] w-full overflow-hidden sm:h-[80svh] lg:order-last lg:h-auto lg:max-h-none lg:min-h-[52rem]">
            {/* The poster sits UNDER the video rather than only in its poster
                attribute, so it covers the first frames while the clip is
                still buffering and stays put if the video never plays at all —
                a data-saver setting, a codec refusal, or reduced motion below.
                Same object-position as the video, so the swap is invisible. */}
            <div
              aria-hidden="true"
              className="absolute inset-0 bg-[url('/images/hero-poster.jpg')] bg-cover bg-[center_52%] bg-no-repeat [filter:grayscale(0.2)_contrast(1.05)_brightness(0.9)] lg:[filter:grayscale(0.2)_contrast(1.03)_brightness(0.95)]"
            />

            {/* muted + playsInline are not optional: without both, iOS refuses
                to autoplay and shows a play button over the hero, and every
                other mobile browser blocks a clip with audio. The file has no
                audio track at all, so there is nothing to unmute.

                motion-reduce:hidden drops the video for anyone who has asked
                their system to limit motion — the poster underneath is then
                what they get, which is the whole reason it is a layer rather
                than an attribute.

                object-position matches the still it replaced: the source is
                720x1280 portrait going into a landscape slot, so object-cover
                crops most of the height and this percentage decides the
                framing. 52% holds the dumbbell racks. */}
            <video
              aria-hidden="true"
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              poster="/images/hero-poster.jpg"
              className="absolute inset-0 size-full object-cover object-[center_52%] [filter:grayscale(0.2)_contrast(1.05)_brightness(0.9)] motion-reduce:hidden lg:object-[center_52%] lg:[filter:grayscale(0.2)_contrast(1.03)_brightness(0.95)]"
            >
              <source src="/video/hero.mp4" type="video/mp4" />
            </video>

            {/* Grades the band into the panel below it, so the overlap reads
                as the copy emerging from the photograph rather than as a
                rectangle parked on top of one. Below lg only — beside the
                copy there is no seam to hide. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[linear-gradient(to_bottom,rgba(18,20,20,0.15)_0%,rgba(18,20,20,0)_45%,rgba(18,20,20,0.95)_100%)] lg:hidden"
            />

            {/* Bolt motif, bled off the left edge where the image meets the
                copy. Pointer-events-none so it never eats a click meant for
                the buttons sitting beside it. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 hidden w-1 bg-primary lg:block"
            />
          </div>

          {/* -mt-6 is the 24px overlap, and `relative` is what makes it land
              above the photograph rather than under it — without a stacking
              context the negative margin moves the box and the image still
              paints last. Cancelled at lg, where the two sit side by side and
              there is nothing to overlap. */}
          <div className="relative z-10 -mt-6 flex flex-col items-start justify-center gap-0 bg-background px-margin-mobile pb-7 md:px-margin-desktop lg:mt-0 lg:gap-6 lg:py-stack-xl">
            {/* The hero takes a rule ABOVE its eyebrow rather than the inline
                bar every other Eyebrow on the site carries. It is the one
                place on the page with no section heading over it, so the rule
                is doing structural work — marking where the copy starts under
                the photograph — rather than punctuating a label. */}
            <span
              aria-hidden
              className="motion-rise mb-4 block h-[3px] w-14 bg-primary lg:hidden"
            />
            <p className="motion-rise mb-3 flex items-center gap-3 font-mono text-[12px] font-medium tracking-[0.16em] text-primary-soft uppercase lg:mb-0">
              <span aria-hidden className="hidden h-0.5 w-6 shrink-0 bg-primary lg:inline-block" />
              {contentText(content, "home.hero.eyebrow", "Industrial strength discipline")}
            </p>
            <h1
              className="motion-rise mb-3 font-display text-[46px] leading-[0.86] tracking-[-0.035em] text-balance text-foreground uppercase lg:mb-0 lg:text-7xl lg:leading-[0.88] lg:tracking-[-0.02em]"
              style={{ animationDelay: "90ms" }}
            >
              {contentText(content, "home.hero.heading", BRAND.tagline)}
            </h1>
            <p
              className="motion-rise mb-5 max-w-2xl text-body-md text-muted-foreground lg:mb-0 lg:text-body-lg"
              style={{ animationDelay: "180ms" }}
            >
              {contentText(content, "home.hero.subheading", BRAND.description)}
            </p>
            {/* Stacked and full-width on a phone, side by side once there is
                room. Two 52px targets one under the other is the shape a thumb
                expects at the bottom of a first screen; the same pair wrapping
                mid-row, which is what flex-wrap gave at 375px, is not. */}
            <div
              className="motion-rise flex w-full flex-col gap-2.5 lg:mt-2 lg:w-auto lg:flex-row lg:flex-wrap lg:gap-3"
              style={{ animationDelay: "270ms" }}
            >
              <CtaButton href="/membership" className="max-lg:w-full max-lg:py-4">
                {entryPrice !== null ? t("plansFrom", { price: formatPrice(entryPrice) }) : t("seePlans")}
              </CtaButton>
              <WhatsAppCta
                message={`Hi ${BRAND.name}, I have a question about membership.`}
                variant="outline"
                className="max-lg:w-full max-lg:py-4"
              >
                Ask on WhatsApp
              </WhatsAppCta>
            </div>
          </div>
        </div>
      </section>

      {/* Proof strip
          Three facts in one band, and it replaces nothing — the page carried
          no trust signal above the pricing at all. Two of the three are
          counted from the data rather than written down, so they cannot go
          stale the way a hand-typed "10 classes" does the moment somebody adds
          the eleventh.

          gap-px over a border-coloured ground is how every seam in this design
          is drawn: the dividers are the background showing through, so there
          is no border to double up where two cells meet. */}
      <section className="w-full border-b border-border bg-border">
        <div className="mx-auto grid w-full max-w-(--spacing-container-max) grid-cols-3 gap-px">
          {[
            { value: "24/7", label: t("statOpen") },
            { value: String(trainers.length), label: t("statCoaches", { count: trainers.length }) },
            {
              value: String(classTypes.length),
              label: t("statClasses", { count: classTypes.length }),
            },
          ].map((stat) => (
            <div key={stat.label} className="bg-surface-1 px-3 py-4 text-center md:py-6">
              <p className="font-display text-[26px] leading-none text-foreground md:text-4xl">
                {stat.value}
              </p>
              <p className="mt-1.5 font-mono text-[12px] font-medium tracking-[0.1em] text-muted-foreground uppercase">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* PRICES BEFORE FACILITIES, and the order is deliberate.

          The page used to run hero → intro → facilities → plans, which is the
          order a brochure is written in: earn the right to ask, then ask. On a
          phone that ordering has a cost the print version never had — the
          plans started 3,900px down, so the one section the page exists to
          sell was four screens past the point most people stop scrolling.

          "What does it cost" is also simply the question visitors arrive with.
          The facilities list is what confirms the decision rather than what
          prompts it, so it now sits underneath, where somebody who has seen a
          price they like goes looking for the reason to say yes. */}
      {/* Membership preview */}
      {plans.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader
            eyebrow="Membership"
            title="Choose your path"
            body="Four tiers, each sold over four terms. Pick how often you intend to train and how long you want to commit for."
            action={{ href: "/membership", label: "Compare all plans", shortLabel: "All plans" }}
          />
          <PricingGrid plans={plans} />
        </Section>
      )}

      {/* Facilities / why us */}
      {whyUs.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader
            eyebrow="What you get"
            title={contentText(content, "home.facilities.heading", "The Experience")}
            body="Everything you need to get stronger, from elite machines to premium free weights."
          />
          {/* 2x2 on a phone, not a single column.
              These are four short noun phrases — "sauna, showers and lockers
              included" — and a phrase that short in a full-width row wastes
              most of the line it is given while still costing a full row of
              height. Two columns halves the block and reads better, because
              four items in a square read as a set where four stacked rows read
              as a list you have to finish. */}
          <ul className="grid grid-cols-2 gap-px border border-border bg-border lg:grid-cols-4">
            {whyUs.map((item) => (
              <li
                key={item}
                className="bg-background p-3.5 text-[14px] leading-[1.4] text-foreground md:p-6"
              >
                <span aria-hidden className="mb-3 block h-0.5 w-6 bg-primary md:mb-4 md:w-8" />
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Classes preview */}
      {classTypes.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader
            eyebrow="Classes"
            title="Train with a coach"
            body="Capped numbers, so you get corrected rather than counted."
            action={{
              href: "/classes",
              label: "All classes",
              shortLabel: `All ${classTypes.length}`,
            }}
          />
          <ExpandingCards
            kind="class"
            locale={locale}
            items={classTypes.slice(0, 4).map((item) => ({
              id: item._id,
              title: item.name,
              image: item.image,
              href: `/classes/${item.slug}`,
              description: item.description,
              meta: locale === "ar"
                ? [`${item.durationMinutes} دقيقة`, `السعة ${item.defaultCapacity}`, `الشدة ${item.intensity}/5`]
                : [`${item.durationMinutes} min`, `${item.defaultCapacity} places`, `Intensity ${item.intensity}/5`],
            }))}
          />
        </Section>
      )}

      {/* Trainers preview */}
      {trainers.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader
            eyebrow="Personal training"
            title="The team"
            body="Coached floor most of the day, and one-to-one when you want it."
            action={{
              href: "/trainers",
              label: "Meet the team",
              shortLabel: `All ${trainers.length}`,
            }}
          />
          <ExpandingCards
            kind="trainer"
            locale={locale}
            items={trainers.slice(0, 4).map((item) => ({
              id: item._id,
              title: item.name,
              image: item.photo,
              href: `/trainers/${item.slug}`,
              subtitle: item.headline,
              description: item.specialties.join(" · "),
              meta: item.yearsOfExperience > 0
                ? [locale === "ar" ? `${item.yearsOfExperience} سنة خبرة` : `${item.yearsOfExperience} years of experience`]
                : [],
            }))}
          />
        </Section>
      )}

      {/* Membership CTA, followed by the full location and social sections. */}
      <Section>
        <div className="flex flex-col items-start gap-4 border-t-2 border-primary bg-surface-1 px-5 py-7 md:items-center md:gap-6 md:px-6 md:py-stack-md md:text-center">
          <h2 className="max-w-2xl font-display text-[34px] leading-[0.88] tracking-[-0.035em] text-balance text-foreground uppercase md:text-5xl md:leading-[0.95] md:tracking-[-0.02em]">
            No excuses
          </h2>
          <p className="max-w-xl text-[15px] leading-[1.5] text-muted-foreground md:text-body-md">
            Come and see the place before you decide. Somebody at the desk will tell you honestly
            which tier fits.
          </p>
          <div className="flex w-full flex-col gap-2.5 md:w-auto md:flex-row md:flex-wrap md:justify-center md:gap-3">
            <CtaButton href="/membership" className="max-md:w-full max-md:py-4">
              See plans and prices
            </CtaButton>
            <WhatsAppCta
              message={`Hi ${BRAND.name}, I have a question about membership.`}
              variant="outline"
              className="max-md:w-full max-md:py-4"
            >
              Talk to us
            </WhatsAppCta>
          </div>
        </div>
      </Section>

      <VisitUsSection branch={branch} locale={locale} />
      <FollowUsSection locale={locale} />
    </>
  );
}
