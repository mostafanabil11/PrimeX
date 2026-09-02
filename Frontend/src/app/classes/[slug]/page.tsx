import type { Metadata } from "next";
import { Link } from "@/i18n/navigation";
import { Photo } from "@/components/public/photo";
import { notFound } from "next/navigation";
import { Clock, Users } from "lucide-react";
import { getClassTypeBySlugServer, getClassTypesServer } from "@/lib/api/gym-server";
import { pageTitle, BRAND } from "@/lib/brand";
import { INTENSITY_LABELS } from "@/lib/gym-format";
// Whether anybody is able to write a review at all. The form inside
// ClassReviewsSection is gated on a signed-in member, so this flag is what
// decides whether an empty reviews panel is a genuine empty state or a dead
// end. Named locally rather than read inline so the JSX below states its
// intent rather than a flag name that means something broader.
import { MEMBER_ACCOUNTS_ENABLED as REVIEWS_VISIBLE } from "@/lib/features";
import { Section, CtaButton } from "@/components/public/section";
import { WhatsAppCta } from "@/components/public/whatsapp";
import { classEnquiry } from "@/lib/whatsapp-messages";
import { IntensityBar } from "@/components/public/cards";
import { ClassReviewsSection } from "@/components/public/class-reviews-section";

interface Params {
  slug: string;
}

export async function generateStaticParams() {
  const classTypes = await getClassTypesServer();
  return classTypes.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Promise<Params> }): Promise<Metadata> {
  const { slug } = await params;
  const classType = await getClassTypeBySlugServer(slug);

  if (!classType) {
    return { title: pageTitle("Class not found") };
  }

  return {
    title: pageTitle(classType.name),
    description:
      classType.description?.slice(0, 160) ??
      `${classType.name} — a ${classType.durationMinutes} minute class.`,
    alternates: { canonical: `/classes/${classType.slug}` },
  };
}

export default async function ClassTypePage({ params }: { params: Promise<Params> }) {
  const { slug } = await params;
  const classType = await getClassTypeBySlugServer(slug);

  if (!classType) {
    notFound();
  }

  return (
    <>
      <div className="w-full border-b border-border px-margin-mobile pt-stack-md pb-stack-sm md:px-margin-desktop">
        <div className="mx-auto flex w-full max-w-(--spacing-container-max) flex-col gap-4">
          <Link
            href="/classes"
            className="-my-3 inline-flex min-h-11 w-fit items-center py-3 font-mono text-[11px] font-semibold tracking-[0.16em] text-primary-soft uppercase hover:underline"
          >
            ← All classes
          </Link>
          <h1 className="font-display text-5xl leading-[0.92] tracking-[-0.02em] text-foreground uppercase md:text-7xl">
            {classType.name}
          </h1>
          {classType.description && (
            <p className="max-w-2xl text-body-lg text-muted-foreground">{classType.description}</p>
          )}
        </div>
      </div>

      {/* Cover shot, when the class has one. A class without a photo keeps
          the text-only layout rather than showing an empty frame — same
          pattern as the trainer pages. */}
      {classType.image && (
        <div className="relative aspect-[16/9] w-full overflow-hidden border-b border-border sm:aspect-[21/9] lg:aspect-[3/1]">
          <Photo
            src={classType.image}
            alt={`${classType.name} at ${BRAND.name}`}
            fill
            priority
            sizes="100vw"
            className="object-cover"
          />
        </div>
      )}

      <Section>
        <div className="grid gap-stack-sm lg:grid-cols-[2fr_1fr]">
          <div className="flex flex-col gap-6">
            {classType.equipment.length > 0 && (
              <div>
                <h2 className="mb-3 font-display text-xl tracking-[-0.02em] text-foreground uppercase">
                  What you will use
                </h2>
                <ul className="flex flex-wrap gap-2">
                  {classType.equipment.map((e) => (
                    <li
                      key={e}
                      className="bg-surface-3 px-3 py-1.5 text-[12px] font-medium text-foreground"
                    >
                      {e}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {classType.equipment.length === 0 && (
              <p className="text-[14px] text-muted-foreground">
                Message us on WhatsApp for the full details on this class — what it covers,
                who coaches it, and when it runs.
              </p>
            )}
          </div>

          <aside className="flex h-fit flex-col gap-5 border border-border bg-surface-1 p-6">
            <dl className="flex flex-col gap-4 text-[13px]">
              <div>
                <dt className="font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Length
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-foreground">
                  <Clock className="size-4" strokeWidth={1.5} />
                  {`${classType.durationMinutes} minutes`}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Group size
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-foreground">
                  <Users className="size-4" strokeWidth={1.5} />
                  {`Up to ${classType.defaultCapacity}`}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                  Intensity
                </dt>
                <dd className="mt-1 flex items-center gap-2 text-foreground">
                  <IntensityBar intensity={classType.intensity} />
                  {INTENSITY_LABELS[classType.intensity]}
                </dd>
              </div>
            </dl>

            <div className="flex flex-col gap-2 border-t border-border pt-5">
              <WhatsAppCta message={classEnquiry(classType.name)} className="w-full">
                Ask about this class
              </WhatsAppCta>
              <CtaButton href="/membership" variant="outline" className="w-full">
                See plans and prices
              </CtaButton>
            </div>
          </aside>
        </div>
      </Section>

      {/* Shown only when it can say something.
          The review form inside this section is gated on a signed-in member,
          and with MEMBER_ACCOUNTS_ENABLED off nobody can be one — so on every
          class page it rendered "Reviews / No reviews yet / Be the first to
          review this class" over most of a phone screen, with no control
          anywhere to actually be the first. An empty state that cannot be
          filled is not an empty state, it is a dead end, and it was the last
          thing a visitor saw before the footer.

          With it gone, the panel above — "Ask about this class" and "See plans
          and prices" — becomes the end of the page on a phone, which is the
          right place to leave somebody who has just read about a class.

          The section returns the moment either condition changes: real reviews
          exist to display, or members can sign in and write one. */}
      {(REVIEWS_VISIBLE || classType.reviewCount > 0) && (
        <ClassReviewsSection
          classTypeId={classType._id}
          averageRating={classType.averageRating}
          reviewCount={classType.reviewCount}
        />
      )}
    </>
  );
}
