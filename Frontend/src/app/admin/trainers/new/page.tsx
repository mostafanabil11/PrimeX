"use client";

import { AdminPageHeader } from "@/components/admin/resource-list";
import { TrainerForm } from "@/components/admin/trainer-form";

export default function NewTrainerPage() {
  return (
    <div>
      <AdminPageHeader title="New trainer" />
      <TrainerForm />
    </div>
  );
}
