import type { Metadata } from "next";
import { getClassTypesServer } from "@/lib/api/gym-server";
import { pageTitle } from "@/lib/brand";
import { PageHeader, Section, EmptyState } from "@/components/public/section";
import { WhatsAppCta } from "@/components/public/whatsapp";
import { classesGeneralEnquiry } from "@/lib/whatsapp-messages";
import { Reveal } from "@/components/public/reveal";
import { ClassTypeCard } from "@/components/public/cards";

export const metadata: Metadata = {
  title: pageTitle("Classes"),
  description:
    "Strength, conditioning, boxing, yoga and more — coached in capped groups so you get seen.",
  alternates: { canonical: "/classes" },
};

export default async function ClassesPage() {
  const classTypes = await getClassTypesServer();

  return (
    <>
      <PageHeader
        eyebrow="Classes"
        title="Train with a coach"
        body="Numbers are capped on every session, which is the whole point — a coach who can see the room can correct it."
      />

      <Section>
        {classTypes.length === 0 ? (
          <EmptyState message="The class list is being updated. Please check back shortly." />
        ) : (
          <div className="grid gap-gutter sm:grid-cols-2 lg:grid-cols-3">
            {classTypes.map((classType, i) => (
              <Reveal key={classType._id} delay={(i % 3) * 80}>
                <ClassTypeCard classType={classType} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>

      <Section className="border-t border-border">
        <div className="flex flex-col items-start gap-4 border border-dashed border-border p-8">
          <h2 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
            Want to join a class?
          </h2>
          <p className="max-w-2xl text-body-md text-muted-foreground">
            Classes run through the week. Message us on WhatsApp and we will tell you what is on
            and put your name down.
          </p>
          <WhatsAppCta message={classesGeneralEnquiry()}>Ask on WhatsApp</WhatsAppCta>
        </div>
      </Section>
    </>
  );
}
