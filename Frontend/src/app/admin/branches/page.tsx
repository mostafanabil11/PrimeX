"use client";

import { useQuery } from "@tanstack/react-query";
import { getBranchesAdmin } from "@/lib/api/gym";
import { AdminPageHeader, ResourceList } from "@/components/admin/resource-list";

export default function AdminBranchesPage() {
  const { data: branches, isLoading } = useQuery({
    queryKey: ["admin", "branches"],
    queryFn: getBranchesAdmin,
  });

  return (
    <div>
      <AdminPageHeader
        title="Branches"
        newHref="/admin/branches/new"
        newLabel="New branch"
        count={branches?.length}
      />
      <ResourceList
        isLoading={isLoading}
        emptyMessage="No branches yet. Add your first location to get started."
        rows={branches?.map((b) => ({
          id: b._id,
          href: `/admin/branches/${b._id}`,
          title: b.name,
          subtitle: `${b.addressLine}, ${b.city} · ${b.governorate}`,
          isActive: b.isActive,
          tags: [
            `${b.facilities.length} facilities`,
            ...(b.womenOnlyWindows.length > 0
              ? [`${b.womenOnlyWindows.length} women-only`]
              : []),
          ],
        }))}
      />
    </div>
  );
}
