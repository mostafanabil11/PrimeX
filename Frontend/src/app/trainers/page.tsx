import type { Metadata } from "next";
import { getTrainersServer } from "@/lib/api/gym-server";
import { pageTitle } from "@/lib/brand";
import { PageHeader, Section, EmptyState } from "@/components/public/section";
import { Reveal } from "@/components/public/reveal";
import { TrainerCard } from "@/components/public/cards";

export const metadata: Metadata = {
  title: pageTitle("Trainers"),
  description:
    "The coaches you will train with — their specialties, certifications and where they are based.",
  alternates: { canonical: "/trainers" },
};

export default async function TrainersPage() {
  const trainers = await getTrainersServer();

  return (
    <>
      <PageHeader
        eyebrow="Coaching"
        title="The people you will train with"
        body="Certified, not just enthusiastic. Most of them still compete."
      />

      <Section>
        {trainers.length === 0 ? (
          <EmptyState message="Trainer profiles are being updated. Please check back shortly." />
        ) : (
          <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-3">
            {trainers.map((trainer, i) => (
              <Reveal key={trainer._id} delay={(i % 3) * 80}>
                <TrainerCard trainer={trainer} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
