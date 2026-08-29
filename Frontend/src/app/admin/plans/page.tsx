"use client";

import { useQuery } from "@tanstack/react-query";
import { getPlansAdmin } from "@/lib/api/gym";
import { formatPrice } from "@/lib/format";
import { AdminPageHeader, ResourceList } from "@/components/admin/resource-list";
import type { Plan } from "@/types/gym";

function describeAccess(plan: Plan): string[] {
  const classes =
    plan.classAccess.mode === "unlimited"
      ? "Unlimited classes"
      : plan.classAccess.mode === "credits"
        ? `${plan.classAccess.creditsPerCycle} credits`
        : "No classes";

  return [classes, plan.branchAccess === "all" ? "All branches" : "One branch"];
}

function describeTerm(plan: Plan): string {
  const unit = plan.durationValue === 1 ? plan.durationUnit : `${plan.durationUnit}s`;
  return `${plan.durationValue} ${unit}`;
}

export default function AdminPlansPage() {
  const { data: plans, isLoading } = useQuery({
    queryKey: ["admin", "plans"],
    queryFn: getPlansAdmin,
  });

  return (
    <div>
      <AdminPageHeader
        title="Membership plans"
        newHref="/admin/plans/new"
        newLabel="New plan"
        count={plans?.length}
      />
      <ResourceList
        isLoading={isLoading}
        emptyMessage="No plans yet. Create one so people can join."
        rows={plans?.map((p) => ({
          id: p._id,
          href: `/admin/plans/${p._id}`,
          title: `${p.name}${p.isFeatured ? " ★" : ""}`,
          subtitle: `${formatPrice(p.discountPriceMinorUnits ?? p.priceMinorUnits)} · ${describeTerm(p)}${p.tier ? ` · ${p.tier}` : ""}`,
          isActive: p.isActive,
          tags: describeAccess(p),
        }))}
      />
    </div>
  );
}
