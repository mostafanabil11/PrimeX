"use client";

import { AdminPageHeader } from "@/components/admin/resource-list";
import { ClassTypeForm } from "@/components/admin/class-type-form";

export default function NewClassTypePage() {
  return (
    <div>
      <AdminPageHeader title="New class type" />
      <ClassTypeForm />
    </div>
  );
}
