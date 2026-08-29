import type { Metadata } from "next";
import { getScheduleServer } from "@/lib/api/schedule";
import { getClassTypesServer } from "@/lib/api/gym-server";
import { pageTitle } from "@/lib/brand";
import { PageHeader, Section, EmptyState } from "@/components/public/section";
import { Timetable } from "@/components/schedule/timetable";
import { requireClassBooking } from "@/lib/features";

export const metadata: Metadata = {
  title: pageTitle("Class Schedule"),
  description:
    "This week's classes — times, coaches and how many places are left.",
  alternates: { canonical: "/schedule" },
};

export default async function SchedulePage() {
  requireClassBooking();

  const [timetable, classTypes] = await Promise.all([
    getScheduleServer(),
    getClassTypesServer(),
  ]);

  return (
    <>
      <PageHeader
        eyebrow="Timetable"
        title="What's on"
        body="Booking opens two weeks ahead and closes an hour before a class starts. Numbers are capped, so the popular sessions go early."
      />

      <Section>
        {timetable.sessions.length === 0 ? (
          <EmptyState message="The timetable is being updated. Call us and we will tell you what is running." />
        ) : (
          <Timetable classTypes={classTypes} initial={timetable} />
        )}
      </Section>
    </>
  );
}
