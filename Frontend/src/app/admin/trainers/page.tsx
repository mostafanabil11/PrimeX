"use client";

import { useQuery } from "@tanstack/react-query";
import { getTrainersAdmin } from "@/lib/api/gym";
import { AdminPageHeader, ResourceList } from "@/components/admin/resource-list";

export default function AdminTrainersPage() {
  const { data: trainers, isLoading } = useQuery({
    queryKey: ["admin", "trainers"],
    queryFn: getTrainersAdmin,
  });

  return (
    <div>
      <AdminPageHeader
        title="Trainers"
        newHref="/admin/trainers/new"
        newLabel="New trainer"
        count={trainers?.length}
      />
      <ResourceList
        isLoading={isLoading}
        emptyMessage="No trainers yet."
        rows={trainers?.map((t) => ({
          id: t._id,
          href: `/admin/trainers/${t._id}`,
          title: t.name,
          subtitle: [t.headline, t.specialties.slice(0, 3).join(", ")]
            .filter(Boolean)
            .join(" · "),
          isActive: t.isActive,
          tags: [
            `${t.branches.length} ${t.branches.length === 1 ? "branch" : "branches"}`,
            ...(t.hourlyRateMinorUnits !== null ? ["PT"] : []),
          ],
        }))}
      />
    </div>
  );
}
