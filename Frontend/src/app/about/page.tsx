import type { Metadata } from "next";
import { Photo } from "@/components/public/photo";
import { getContentServer, getBranchesServer, getTrainersServer } from "@/lib/api/gym-server";
import { contentText, contentList } from "@/types/gym";
import { BRAND, pageTitle } from "@/lib/brand";
import { PageHeader, Section, SectionHeader, CtaButton } from "@/components/public/section";
import { Reveal } from "@/components/public/reveal";
import { CountUp } from "@/components/public/count-up";

export const metadata: Metadata = {
  title: pageTitle("About"),
  description: `How ${BRAND.name} started, what it is for, and why people train here.`,
  alternates: { canonical: "/about" },
};

export default async function AboutPage() {
  const [content, branches, trainers] = await Promise.all([
    getContentServer(),
    getBranchesServer(),
    getTrainersServer(),
  ]);

  const whyUs = contentList(content, "about.whyUs.items");

  // Derived from the data rather than typed into copy, so they cannot drift
  // out of date the way a hardcoded "6 expert coaches" always eventually does.
  const stats = [
    branches.length > 0 && {
      value: branches.length,
      label: branches.length === 1 ? "Location" : "Locations",
    },
    trainers.length > 0 && {
      value: trainers.length,
      label: trainers.length === 1 ? "Coach" : "Coaches",
    },
    {
      value: trainers.reduce((max, t) => Math.max(max, t.yearsOfExperience), 0) || 0,
      label: "Years of coaching experience",
    },
  ].filter(Boolean) as Array<{ value: number; label: string }>;

  return (
    <>
      <PageHeader
        eyebrow="About"
        title={contentText(content, "about.story.heading", "Our Story")}
      />

      <Section>
        <p className="max-w-3xl text-body-lg leading-relaxed text-muted-foreground">
          {contentText(content, "about.story.body", "")}
        </p>
      </Section>

      {/* border-t only: the stats Section right after already supplies its
          own border-t, and a border-b here would double that line. */}
      <div className="relative aspect-[4/3] w-full overflow-hidden border-t border-border sm:aspect-[16/9]">
        <Photo
          src="/images/about-story.jpg"
          alt=""
          fill
          quality={100}
          unoptimized={true}
          sizes="100vw"
          className="object-cover"
        />
      </div>

      {stats.length > 0 && (
        <Section className="border-t border-border">
          <dl className="grid gap-px bg-border sm:grid-cols-3">
            {stats.map((stat, i) => (
              <Reveal key={stat.label} delay={i * 90} className="bg-background px-6 py-8">
                <dt className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                  {stat.label}
                </dt>
                {/* tabular-nums matters more than usual here: without it the
                    digits change width as the number climbs and the whole
                    figure jitters sideways while counting. */}
                <dd className="mt-2 font-display text-5xl tracking-[-0.02em] text-primary tabular-nums">
                  <CountUp value={stat.value} />
                </dd>
              </Reveal>
            ))}
          </dl>
        </Section>
      )}

      <Section className="border-t border-border">
        <SectionHeader
          eyebrow="Mission"
          title={contentText(content, "about.mission.heading", "What We Are For")}
          body={contentText(content, "about.mission.body", "")}
        />
      </Section>

      {whyUs.length > 0 && (
        <Section className="border-t border-border">
          <SectionHeader eyebrow="Why here" title="What makes the difference" />
          <ul className="grid gap-px bg-border sm:grid-cols-2">
            {whyUs.map((item, i) => (
              <li key={item} className="bg-background">
                <Reveal delay={(i % 2) * 80} className="p-6 text-[15px] text-foreground">
                  <span aria-hidden className="mb-4 block h-0.5 w-8 bg-primary" />
                  {item}
                </Reveal>
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section className="border-t border-border">
        <div className="flex flex-col items-center gap-5 text-center">
          <h2 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase md:text-4xl">
            Come and see it
          </h2>
          <p className="max-w-xl text-body-md text-muted-foreground">
            The floor tells you more than any page can. Book a session and have a look around.
          </p>
          <div className="flex flex-wrap justify-center gap-3">
            <CtaButton href="/membership">See plans and prices</CtaButton>
            <CtaButton href="/contact" variant="outline">
              Find us
            </CtaButton>
          </div>
        </div>
      </Section>
    </>
  );
}
