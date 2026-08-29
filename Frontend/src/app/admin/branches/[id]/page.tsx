"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getBranchAdmin } from "@/lib/api/gym";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { BranchForm } from "@/components/admin/branch-form";

export default function EditBranchPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: branch, isLoading } = useQuery({
    queryKey: ["admin", "branches", id],
    queryFn: () => getBranchAdmin(id),
  });

  if (isLoading || !branch) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  return (
    <div>
      <AdminPageHeader title={branch.name} />
      {/* keyed so switching between branches remounts the form with fresh
          state rather than showing the previous record's values */}
      <BranchForm key={branch._id} branch={branch} />
    </div>
  );
}
