import type { Metadata } from "next";
import { getClassTypesServer } from "@/lib/api/gym-server";
import { pageTitle } from "@/lib/brand";
import { TrainingCatalog } from "@/components/public/training-catalog";

export const metadata: Metadata = {
  title: pageTitle("Classes"),
  description:
    "Strength, conditioning, boxing, yoga and more — coached in capped groups so you get seen.",
  alternates: { canonical: "/classes" },
};

export default async function ClassesPage() {
  const classTypes = await getClassTypesServer();

  return <TrainingCatalog kind="classes" items={classTypes} />;
}
