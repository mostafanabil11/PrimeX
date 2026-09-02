import type { Metadata } from "next";
import { getTrainersServer } from "@/lib/api/gym-server";
import { BRAND, pageTitle } from "@/lib/brand";
import { PageHeader, Section, EmptyState } from "@/components/public/section";
import { Reveal } from "@/components/public/reveal";
import { TrainerCard } from "@/components/public/cards";

// The route stays /trainers. The nav label and the page now say "Personal
// training", because that is the thing being sold — a coach is who you get,
// not what you buy — but the URL is already indexed and linked from the
// homepage, the footer and every class page, and renaming it would trade real
// inbound links for a tidier path. next.config.ts is where a redirect would go
// if that ever stops being the right call.
export const metadata: Metadata = {
  title: pageTitle("Personal Training"),
  description: `One-to-one coaching at ${BRAND.name}. Pick the coach you want to train with, tell us when you can train, and we will confirm the details on WhatsApp.`,
  alternates: { canonical: "/trainers" },
};

export default async function TrainersPage() {
  const trainers = await getTrainersServer();

  return (
    <>
      <PageHeader
        eyebrow="Personal training"
        title="Private Sessions"
        body="Pick the coach you want to work with. Every profile takes a request directly — tell them when you can train and what you are working towards, and the team confirms times and pricing with you on WhatsApp."
      />

      <Section>
        {trainers.length === 0 ? (
          <EmptyState message="Coach profiles are being updated. Please check back shortly." />
        ) : (
          <>
            {/* The cards are already whole-card links to each profile, and each
                profile is where the request form lives. No second "book" button
                per card: it would either duplicate the link or imply the
                booking can happen without choosing a coach, and choosing the
                coach is the entire point of this page. */}
            <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-3">
              {trainers.map((trainer, i) => (
                <Reveal key={trainer._id} delay={(i % 3) * 80}>
                  <TrainerCard trainer={trainer} />
                </Reveal>
              ))}
            </div>

            <p className="mt-stack-sm max-w-2xl text-[14px] leading-relaxed text-muted-foreground">
              Not sure who to pick? Open any profile and send a request anyway —
              the team will point you at the right coach for what you are after.
            </p>
          </>
        )}
      </Section>
    </>
  );
}
