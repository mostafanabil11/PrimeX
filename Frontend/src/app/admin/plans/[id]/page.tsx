"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getPlanAdmin } from "@/lib/api/gym";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { PlanForm } from "@/components/admin/plan-form";

export default function EditPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: plan, isLoading } = useQuery({
    queryKey: ["admin", "plans", id],
    queryFn: () => getPlanAdmin(id),
  });

  if (isLoading || !plan) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  return (
    <div>
      <AdminPageHeader title={plan.name} />
      <PlanForm key={plan._id} plan={plan} />
    </div>
  );
}
