"use client";

import { use } from "react";
import { useQuery } from "@tanstack/react-query";
import { getTrainerAdmin } from "@/lib/api/gym";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { TrainerForm } from "@/components/admin/trainer-form";

export default function EditTrainerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const { data: trainer, isLoading } = useQuery({
    queryKey: ["admin", "trainers", id],
    queryFn: () => getTrainerAdmin(id),
  });

  if (isLoading || !trainer) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  return (
    <div>
      <AdminPageHeader title={trainer.name} />
      <TrainerForm key={trainer._id} trainer={trainer} />
    </div>
  );
}
