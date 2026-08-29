"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getClassTypeAdmin } from "@/lib/api/gym";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { ClassTypeForm } from "@/components/admin/class-type-form";

export default function EditClassTypePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: classType, isLoading } = useQuery({
    queryKey: ["admin", "class-types", id],
    queryFn: () => getClassTypeAdmin(id),
  });

  if (isLoading || !classType) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  return (
    <div>
      <AdminPageHeader title={classType.name} />
      <ClassTypeForm key={classType._id} classType={classType} />
    </div>
  );
}
