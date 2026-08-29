"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getAuditLog } from "@/lib/api/admin";

export default function AdminAuditLogPage() {
  const [page, setPage] = useState(1);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "audit-log", page],
    queryFn: () => getAuditLog({ page, limit: 50 }),
  });

  return (
    <div>
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground">Audit Log</h1>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : data.items.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No admin actions recorded yet.</p>
      ) : (
        <>
          <div className="divide-y divide-border border-t border-b border-border">
            {data.items.map((entry) => (
              <div key={entry._id} className="py-3 text-[13px]">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-medium text-foreground">{entry.action}</span>
                  <span className="text-[12px] text-muted-foreground">
                    {new Date(entry.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
                <p className="mt-1 text-[12px] text-muted-foreground">
                  {entry.adminEmail ?? "Unknown admin"}
                  {entry.resultSummary?.id && ` · ${entry.resultSummary.id}`}
                </p>
              </div>
            ))}
          </div>

          {data.pagination.pages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-4 text-[13px]">
              <button
                type="button"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="text-muted-foreground underline disabled:opacity-30"
              >
                Previous
              </button>
              <span className="text-muted-foreground">
                Page {data.pagination.page} of {data.pagination.pages}
              </span>
              <button
                type="button"
                onClick={() => setPage((p) => Math.min(data.pagination.pages, p + 1))}
                disabled={page === data.pagination.pages}
                className="text-muted-foreground underline disabled:opacity-30"
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
