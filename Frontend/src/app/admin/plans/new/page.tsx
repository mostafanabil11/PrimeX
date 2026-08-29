"use client";

import { AdminPageHeader } from "@/components/admin/resource-list";
import { PlanForm } from "@/components/admin/plan-form";

export default function NewPlanPage() {
  return (
    <div>
      <AdminPageHeader title="New plan" />
      <PlanForm />
    </div>
  );
}
