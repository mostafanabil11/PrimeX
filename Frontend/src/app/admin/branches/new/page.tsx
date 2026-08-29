"use client";

import { AdminPageHeader } from "@/components/admin/resource-list";
import { BranchForm } from "@/components/admin/branch-form";

export default function NewBranchPage() {
  return (
    <div>
      <AdminPageHeader title="New branch" />
      <BranchForm />
    </div>
  );
}
