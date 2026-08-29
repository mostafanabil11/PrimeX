"use client";

import { useQuery } from "@tanstack/react-query";
import { getClassTypesAdmin } from "@/lib/api/gym";
import { AdminPageHeader, ResourceList } from "@/components/admin/resource-list";

const INTENSITY = ["", "Very easy", "Easy", "Moderate", "Hard", "Very hard"];

export default function AdminClassTypesPage() {
  const { data: classTypes, isLoading } = useQuery({
    queryKey: ["admin", "class-types"],
    queryFn: getClassTypesAdmin,
  });

  return (
    <div>
      <AdminPageHeader
        title="Class types"
        newHref="/admin/class-types/new"
        newLabel="New class type"
        count={classTypes?.length}
      />
      <ResourceList
        isLoading={isLoading}
        emptyMessage="No class types yet. Add one before building the schedule."
        rows={classTypes?.map((c) => ({
          id: c._id,
          href: `/admin/class-types/${c._id}`,
          title: c.name,
          subtitle: c.description ?? undefined,
          isActive: c.isActive,
          tags: [`${c.durationMinutes} min`, `cap ${c.defaultCapacity}`, INTENSITY[c.intensity]],
        }))}
      />
    </div>
  );
}
