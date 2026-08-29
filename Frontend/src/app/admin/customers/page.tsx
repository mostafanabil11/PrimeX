"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCustomers } from "@/lib/api/admin";
import { AdminPageHeader } from "@/components/admin/resource-list";

const ROLE_LABELS: Record<string, string> = {
  member: "Member",
  trainer: "Trainer",
  staff: "Staff",
  admin: "Admin",
};

export default function AdminCustomersPage() {
  const [page, setPage] = useState(1);
  const [q, setQ] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "customers", page, q],
    queryFn: () => getCustomers({ page, limit: 20, q: q.trim() || undefined }),
  });

  return (
    <div>
      <AdminPageHeader title="Members" count={data?.pagination.total} />

      <input
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setPage(1);
        }}
        placeholder="Search by name or email…"
        className="mb-6 w-full max-w-sm border border-border bg-surface-2 px-4 py-2.5 text-[13px] text-foreground outline-none focus:border-ring focus:ring-1 focus:ring-ring"
      />

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : data.items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No one matches that search.</p>
      ) : (
        <>
          <div className="border-t border-b border-border">
            {data.items.map((customer) => (
              <Link
                key={customer._id}
                href={`/admin/customers/${customer._id}`}
                className="flex items-center justify-between gap-4 border-b border-border py-3.5 text-[13px] transition-colors last:border-0 hover:bg-surface-1"
              >
                <div>
                  <p className="flex items-center gap-2 font-medium text-foreground">
                    {customer.firstName} {customer.lastName}
                    {customer.role !== "member" && (
                      <span className="bg-surface-3 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.06em] text-foreground uppercase">
                        {ROLE_LABELS[customer.role] ?? customer.role}
                      </span>
                    )}
                  </p>
                  <p className="text-muted-foreground">{customer.email}</p>
                </div>
                <div className="text-right text-[12px] text-muted-foreground">
                  <p>{customer.authProvider === "google" ? "Google" : "Email"}</p>
                  <p>{customer.isEmailVerified ? "Verified" : "Unverified"}</p>
                </div>
              </Link>
            ))}
          </div>

          {data.pagination.pages > 1 && (
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="border border-border px-4 py-2 font-mono text-[12px] font-semibold tracking-[0.06em] text-foreground uppercase disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[12px] text-muted-foreground tabular-nums">
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="border border-border px-4 py-2 font-mono text-[12px] font-semibold tracking-[0.06em] text-foreground uppercase disabled:opacity-40"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
