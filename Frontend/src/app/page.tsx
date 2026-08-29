import type { Metadata } from "next";
import { Photo } from "@/components/public/photo";
import {
  getContentServer,
  getPlansServer,
  getBranchesServer,
  getTrainersServer,
  getClassTypesServer,
  getTestimonialsServer,
} from "@/lib/api/gym-server";
import { contentText, contentList } from "@/types/gym";
import { BRAND, siteUrl } from "@/lib/brand";
import { OrganizationSchema } from "@/components/public/structured-data";
import { Section, SectionHeader, CtaButton, Eyebrow } from "@/components/public/section";
import { WhatsAppCta } from "@/components/public/whatsapp";
import { joinEnquiry } from "@/lib/whatsapp-messages";
import { PricingGrid } from "@/components/public/pricing-grid";
import { Reveal } from "@/components/public/reveal";
import {
  TrainerCard,
  ClassTypeCard,
  TestimonialCard,
} from "@/components/public/cards";

export const metadata: Metadata = {
  alternates: { canonical: "/" },
};

export default async function Home() {
  // One round of parallel fetches rather than a waterfall — every section is
  // independent, and awaiting them in sequence would add up to a slow page for
  // no reason.
  const [content, plans, branches, trainers, classTypes, testimonials] = await Promise.all([
    getContentServer(),
    getPlansServer(),
    // Still fetched, but for the structured data rather than a section: one
    // address is a fact search engines want and not a page worth building.
    getBranchesServer(),
    getTrainersServer(),
    getClassTypesServer(),
    getTestimonialsServer(),
  ]);

  // Show the highlighted plans if any are marked, otherwise the first three, so
  // the section is never empty just because nobody set the flag.
  const whyUs = contentList(content, "about.whyUs.items");

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
          Copy sits beside the photograph rather than on top of it. Laying it
          over was tried and cannot work here: the frame carries hard specular
          highlights, so holding 4.5:1 for the muted subheading needs a scrim
          around 85% — and this photograph averages only 33/255 against a
          22/255 page, so a scrim that heavy erases it completely. Splitting
          the two gives the copy solid ground and the photograph full strength,
          instead of compromising both. */}
      <section className="w-full border-b border-border">
        <div className="mx-auto grid w-full max-w-(--spacing-container-max) grid-cols-1 items-stretch lg:grid-cols-2">
          {/* Leads on mobile, where an image is the hook, and moves alongside
              the copy once there is width for both. Decorative: the headline
              carries the meaning, so an empty alt keeps a screen reader from
              narrating scenery. */}
          <div className="relative order-first min-h-96 w-full overflow-hidden sm:min-h-[400px] lg:order-last lg:min-h-[38rem]">
            {/* Was a looping background video. Now a still, and deliberately
                so — the footage was of the old gym. This is a placeholder
                holding the frame until PrimeX photography is shot, which is
                why it keeps the old file name.

                `priority` because this is the LCP element: it is the largest
                thing above the fold, so it must not be lazy-loaded and must
                not fade (see Photo — a faded element does not count as
                painted and would push the metric out by the fade duration).

                The treatment is the design's, not an accident: photography in
                this brand is high-contrast and desaturated so that red stays
                the only saturated thing on the page. The values duplicate the
                shared [data-photo] rule in globals.css by hand, because
                `priority` is exactly what stops Photo tagging this element
                data-photo — so the shared rule never reaches it. Keep the two
                in step. */}
            <Photo
              src="/images/hero-home.jpg"
              alt=""
              fill
              priority
              quality={90}
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="object-cover object-center brightness-[0.75] contrast-110 grayscale-[0.85]"
            />
            {/* Bolt motif, bled off the left edge where the image meets the
                copy. Pointer-events-none so it never eats a click meant for
                the buttons sitting beside it. */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-y-0 left-0 hidden w-1 bg-primary lg:block"
            />
          </div>

          {/* Entrance staggered top to bottom, so the eye is led down to the
              two buttons rather than arriving everywhere at once. Keyframes
              rather than the scroll observer: this is on screen the moment the
              page is, so there is nothing to wait for. */}
          <div className="flex flex-col items-start justify-center gap-6 px-margin-mobile py-stack-lg md:px-margin-desktop lg:py-stack-xl">
            <Eyebrow className="motion-rise">
              {contentText(content, "home.hero.eyebrow", "Industrial strength discipline")}
            </Eyebrow>
            <h1
              className="motion-rise font-display text-6xl leading-[0.88] tracking-[-0.02em] text-balance text-foreground uppercase md:text-7xl"
              style={{ animationDelay: "90ms" }}
            >
              {contentText(content, "home.hero.heading", BRAND.tagline)}
            </h1>
            <p
              className="motion-rise max-w-2xl text-body-lg text-muted-foreground"
              style={{ animationDelay: "180ms" }}
            >
              {contentText(content, "home.hero.subheading", BRAND.description)}
            </p>
            <div
              className="motion-rise mt-2 flex flex-wrap gap-3"
              style={{ animationDelay: "270ms" }}
            >
              <WhatsAppCta message={joinEnquiry()}>Join on WhatsApp</WhatsAppCta>
              <CtaButton href="/membership" variant="outline">
                See plans and prices
              </CtaButton>
            </div>
          </div>
        </div>
      </section>

      {/* Introduction */}
      <Section className="border-b border-border">
        <Reveal className="flex flex-col items-center gap-5 text-center">
          <h2 className="max-w-3xl font-display text-4xl leading-[0.95] tracking-[-0.02em] text-balance text-primary uppercase md:text-5xl">
            {contentText(content, "home.intro.heading", "Discipline Is The Ultimate Luxury")}
          </h2>
          <p className="max-w-2xl text-body-md text-muted-foreground">
            {contentText(content, "home.intro.body", "")}
          </p>
        </Reveal>

        {/* Three frames, no gap — a hairline grid rather than a soft gallery,
            matching the bg-border/gap-px treatment the facilities list below
            uses. One full-width photo per row on a phone, side by side from
            sm up — never three squeezed thumbnails on a narrow screen. */}
        <div className="mt-10 grid gap-px bg-border sm:grid-cols-3">
          {[
            { src: "/images/home-intro-1.jpg", alt: "Chalked hands on a barbell" },
            { src: "/images/home-intro-2.jpg", alt: "An athlete mid-lift" },
            { src: "/images/home-intro-3.jpg", alt: "Training alone at dawn" },
          ].map((img, i) => (
            <Reveal
              key={img.src}
              delay={i * 90}
              className="relative aspect-[3/4] overflow-hidden bg-background"
            >
              <Photo
                src={img.src}
                alt={img.alt}
                fill
                quality={100}
                unoptimized={true}
                sizes="(min-width: 640px) 34vw, 100vw"
                className="object-cover"
              />
            </Reveal>
          ))}
        </div>
      </Section>

      {/* Facilities / why us */}
      {whyUs.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader
            eyebrow="What you get"
            title={contentText(content, "home.facilities.heading", "The Experience")}
            body={contentText(content, "home.facilities.body", "")}
          />
          <ul className="grid gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {whyUs.map((item) => (
              <li key={item} className="bg-background p-6 text-[14px] text-foreground">
                <span aria-hidden className="mb-4 block h-0.5 w-8 bg-primary" />
                {item}
              </li>
            ))}
          </ul>
        </Section>
      )}

      {/* Membership preview */}
      {plans.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader
            eyebrow="Membership"
            title="Choose your path"
            body="Four tiers, each sold over four terms. Pick how often you intend to train and how long you want to commit for."
            action={{ href: "/membership", label: "Compare all plans" }}
          />
          <PricingGrid plans={plans} />
        </Section>
      )}

      {/* Classes preview */}
      {classTypes.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader
            eyebrow="Classes"
            title="Train with a coach"
            body="Capped numbers, so you get corrected rather than counted."
            action={{ href: "/classes", label: "All classes" }}
          />
          <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {classTypes.slice(0, 4).map((classType, i) => (
              <Reveal key={classType._id} delay={i * 80}>
                <ClassTypeCard classType={classType} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* Trainers preview */}
      {trainers.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader
            eyebrow="Coaching"
            title="The people you will train with"
            action={{ href: "/trainers", label: "Meet the team" }}
          />
          <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-4">
            {trainers.slice(0, 4).map((trainer, i) => (
              <Reveal key={trainer._id} delay={i * 80}>
                <TrainerCard trainer={trainer} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* Testimonials */}
      {testimonials.length > 0 && (
        <Section className="border-b border-border">
          <SectionHeader eyebrow="Members" title="In their words" align="center" />
          <div className="grid gap-gutter md:grid-cols-2 lg:grid-cols-3">
            {testimonials.slice(0, 3).map((testimonial, i) => (
              <Reveal key={testimonial._id} delay={i * 80}>
                <TestimonialCard testimonial={testimonial} />
              </Reveal>
            ))}
          </div>
        </Section>
      )}

      {/* Closing CTA */}
      <Section>
        <div className="flex flex-col items-center gap-6 bg-surface-1 px-6 py-stack-md text-center">
          <h2 className="max-w-2xl font-display text-4xl leading-[0.95] tracking-[-0.02em] text-balance text-foreground uppercase md:text-5xl">
            No excuses
          </h2>
          <p className="max-w-xl text-body-md text-muted-foreground">
            Come and see the place before you decide. Four tiers, four term lengths, and
            somebody at the desk who will tell you honestly which one fits.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <CtaButton href="/membership">See plans and prices</CtaButton>
            <WhatsAppCta message={joinEnquiry()} variant="outline">
              Talk to us
            </WhatsAppCta>
          </div>
        </div>
      </Section>
    </>
  );
}
