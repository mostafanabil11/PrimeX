"use client";

import { AdminPageHeader } from "@/components/admin/resource-list";
import { RecordMembershipForm } from "@/components/admin/record-membership-form";

export default function NewMembershipPage() {
  return (
    <div>
      <AdminPageHeader title="Record a membership" />
      <RecordMembershipForm />
    </div>
  );
}
