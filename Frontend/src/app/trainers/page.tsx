import type { Metadata } from "next";
import { getTrainersServer } from "@/lib/api/gym-server";
import { BRAND, pageTitle } from "@/lib/brand";
import { TrainingCatalog } from "@/components/public/training-catalog";

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

  return <TrainingCatalog kind="trainers" items={trainers} />;
}
