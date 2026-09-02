import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/public/photo";
import { notFound } from "next/navigation";
import { getTrainerBySlugServer, getTrainersServer } from "@/lib/api/gym-server";
import { BRAND, pageTitle, siteUrl } from "@/lib/brand";
import { trainerBranchNames, DAY_LABELS, formatTime } from "@/lib/gym-format";
import { Section, SectionHeader, CtaButton } from "@/components/public/section";
import { PtReserveForm } from "@/components/trainers/pt-reserve-form";
import { PersonSchema } from "@/components/public/structured-data";
import { getTranslations } from "next-intl/server";

interface Params {
  slug: string;
}

export async function generateStaticParams() {
  const trainers = await getTrainersServer();
  return trainers.map((t) => ({ slug: t.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const trainer = await getTrainerBySlugServer(slug);

  if (!trainer) {
    return { title: pageTitle("Trainer not found") };
  }

  return {
    title: pageTitle(trainer.name),
    description:
      trainer.bio?.slice(0, 160) ??
      `${trainer.name}${trainer.headline ? ` — ${trainer.headline}` : ""}. Specialties, certifications and where to train with them.`,
    alternates: { canonical: `/trainers/${trainer.slug}` },
  };
}

export default async function TrainerPage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const trainer = await getTrainerBySlugServer(slug);

  if (!trainer) {
    notFound();
  }

  const branches = trainerBranchNames(trainer);
  // The small-caps label shared by the facts list, the specialties heading and
  // the availability panel — it was written out four times with the same six
  // utilities.
  const factLabel =
    "font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";
  const firstName = trainer.name.split(" ")[0];
  const t = await getTranslations("PersonalTraining");

  return (
    <>
      <PersonSchema
        name={trainer.name}
        jobTitle={trainer.headline}
        description={trainer.bio}
        imageUrl={trainer.photo ? `${siteUrl()}${trainer.photo}` : null}
        profileUrl={`${siteUrl()}/trainers/${trainer.slug}`}
        worksForName={BRAND.name}
        knowsAbout={trainer.specialties}
      />

      {/* THE PROFILE HEADER — one row, where it used to be three bands.

          The name had a full-width strip, the photo had the next one to
          itself, and how long somebody had been coaching was in a sidebar
          below the fold. On a desktop screen that opened the page with a
          384px square and two thirds of a row of empty ground beside it, and
          you had to scroll past the bio to learn anything about the coach.
          Photo, identity and the three facts worth knowing are one block now.

          The facts move up from the sidebar and the specialties up from the
          body, because both answer "is this the right coach for me?", which is
          the question the top of a profile exists to settle. */}
      <div className="w-full border-b border-border px-margin-mobile pt-stack-md pb-stack-md md:px-margin-desktop">
        <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col gap-6">
          <Link
            href="/trainers"
            className="-my-3 inline-flex min-h-11 w-fit items-center py-3 font-mono text-[11px] font-semibold tracking-[0.16em] text-primary-soft uppercase hover:underline"
          >
            ← All trainers
          </Link>

          <div
            className={`grid gap-8 lg:gap-12 ${
              trainer.photo ? "lg:grid-cols-[minmax(0,360px)_minmax(0,1fr)] lg:items-start" : ""
            }`}
          >
            {trainer.photo && (
              <div className="relative aspect-square w-full max-w-sm overflow-hidden rounded-lg border border-border lg:max-w-none">
                <Photo
                  src={trainer.photo}
                  alt={trainer.name}
                  fill
                  priority
                  quality={90}
                  sizes="(min-width: 1024px) 360px, (min-width: 640px) 384px, 100vw"
                  className="object-cover"
                />
              </div>
            )}

            <div className="flex min-w-0 flex-col gap-5">
              <div className="flex flex-col gap-3">
                <h1 className="font-display text-5xl leading-[0.92] tracking-[-0.02em] text-foreground uppercase md:text-6xl">
                  {trainer.name}
                </h1>
                {trainer.headline && (
                  <p className="font-mono text-[13px] font-semibold tracking-[0.1em] text-primary-soft uppercase">
                    {trainer.headline}
                  </p>
                )}
              </div>

              {(trainer.yearsOfExperience > 0 || branches.length > 0 || trainer.languages.length > 0) && (
                <dl className="grid gap-4 border-t border-border pt-5 text-[13px] sm:grid-cols-3">
                  {trainer.yearsOfExperience > 0 && (
                    <div>
                      <dt className={factLabel}>Experience</dt>
                      <dd className="mt-1 text-foreground">{`${trainer.yearsOfExperience} years`}</dd>
                    </div>
                  )}
                  {branches.length > 0 && (
                    <div>
                      <dt className={factLabel}>Based at</dt>
                      <dd className="mt-1 text-foreground">{branches.join(", ")}</dd>
                    </div>
                  )}
                  {trainer.languages.length > 0 && (
                    <div>
                      <dt className={factLabel}>Languages</dt>
                      <dd className="mt-1 text-foreground">{trainer.languages.join(", ")}</dd>
                    </div>
                  )}
                </dl>
              )}

              {trainer.specialties.length > 0 && (
                <div className="border-t border-border pt-5">
                  <h2 className={`mb-3 ${factLabel}`}>Specialties</h2>
                  <ul className="flex flex-wrap gap-2">
                    {trainer.specialties.map((s) => (
                      <li
                        key={s}
                        className="bg-surface-3 px-3 py-1.5 text-[12px] font-medium text-foreground"
                      >
                        {s}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Section>
        <div className="grid gap-stack-sm lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            {trainer.bio && (
              <p className="max-w-2xl text-body-lg leading-relaxed text-muted-foreground">
                {trainer.bio}
              </p>
            )}

            {trainer.certifications.length > 0 && (
              <div>
                <h2 className="mb-3 font-display text-xl tracking-[-0.02em] text-foreground uppercase">
                  Certifications
                </h2>
                <ul className="flex flex-col gap-2">
                  {trainer.certifications.map((c) => (
                    <li
                      key={c}
                      className="flex items-start gap-2.5 text-[14px] text-muted-foreground"
                    >
                      <span aria-hidden className="mt-2 size-1 shrink-0 bg-primary" />
                      {c}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <aside className="flex h-fit flex-col gap-5 border border-border bg-surface-1 p-6">
            {trainer.availability.length > 0 && (
              <div>
                <p className={`mb-2 ${factLabel}`}>Usually available</p>
                <ul className="flex flex-col gap-1 text-[13px] text-muted-foreground">
                  {trainer.availability.map((w) => (
                    <li key={`${w.day}-${w.startsAt}`} className="flex justify-between gap-4">
                      <span className="text-foreground">{DAY_LABELS[w.day]}</span>
                      <span className="tabular-nums">
                        {formatTime(w.startsAt)} – {formatTime(w.endsAt)}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* No "Train with X" button here any more.
                It was an anchor to a form that is already rendered further down
                the same page, so pressing it moved the scroll position and
                nothing else — it read as a control that had failed rather than
                one that had worked. The form is the page's purpose and stays
                visible; hiding it behind this button instead would have put a
                click in front of the only thing the page is for. */}
            <div className="border-t border-border pt-5">
              <CtaButton href="/membership" variant="outline" className="w-full">
                See membership plans
              </CtaButton>
            </div>
          </aside>
        </div>
      </Section>

      {/* The request itself.
          Its own full-width section rather than a field or two tucked in the
          sidebar: this is what the page is for, and burying the only action
          under a bio was the previous version's mistake. scroll-mt clears the
          sticky header, which would otherwise swallow the heading when the
          anchor above jumps here. */}
      <Section id="request" className="scroll-mt-24 border-t border-border">
        {/* No column grid around this any more. The form brings its own
            two-column layout — a sticky coach summary beside the fields, the
            same shape the membership reservation uses — and the old
            lg:grid-cols-[2fr_1fr] wrapper with a max-w-xl inside it left the
            form 576px wide, narrower than one of its own columns. */}
        <div className="mx-auto w-full max-w-[1040px]">
          <SectionHeader
            eyebrow={t("pageEyebrow")}
            title={t("pageTitle", { name: firstName })}
            body={t("pageBody", { name: firstName })}
          />
        </div>
        <div className="mt-stack-sm">
          <PtReserveForm
            trainerId={trainer._id}
            trainerFirstName={firstName}
            trainerName={trainer.name}
            trainerPhoto={trainer.photo}
            trainerHeadline={trainer.headline}
            trainerYears={trainer.yearsOfExperience}
          />
        </div>
      </Section>
    </>
  );
}
