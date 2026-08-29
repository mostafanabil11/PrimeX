"use client";

import Link from "next/link";
import { Plus } from "lucide-react";

// Branches, plans, trainers and class types all list the same way: a title, a
// "new" button, then rows that link to an edit page and show a secondary line
// of detail. Extracted so the four pages differ only in what they put in a
// row, not in how the page is built.

export function AdminPageHeader({
  title,
  newHref,
  newLabel,
  count,
}: {
  title: string;
  newHref?: string;
  newLabel?: string;
  count?: number;
}) {
  return (
    <div className="mb-8 flex items-center justify-between gap-4">
      <div>
        <h1 className="font-display text-2xl tracking-[-0.02em] text-foreground uppercase">
          {title}
        </h1>
        {count !== undefined && (
          <p className="mt-1 text-[12px] text-muted-foreground">
            {count} {count === 1 ? "record" : "records"}
          </p>
        )}
      </div>
      {newHref && (
        <Link
          href={newHref}
          className="flex shrink-0 items-center gap-2 bg-primary px-5 py-2.5 text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
        >
          <Plus className="size-4" strokeWidth={2} />
          {newLabel ?? "New"}
        </Link>
      )}
    </div>
  );
}

export interface ResourceRow {
  id: string;
  href: string;
  title: string;
  subtitle?: string;
  isActive: boolean;
  // Small labels on the right — access mode, intensity, branch count.
  tags?: string[];
}

export function ResourceList({
  rows,
  isLoading,
  emptyMessage,
}: {
  rows: ResourceRow[] | undefined;
  isLoading: boolean;
  emptyMessage: string;
}) {
  if (isLoading || !rows) {
    return <div className="h-64 animate-pulse bg-muted" />;
  }

  if (rows.length === 0) {
    return <p className="text-[13px] text-muted-foreground">{emptyMessage}</p>;
  }

  return (
    <div className="divide-y divide-border border-t border-b border-border">
      {rows.map((row) => (
        <Link
          key={row.id}
          href={row.href}
          className={`flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-surface-1 ${
            row.isActive ? "" : "opacity-50"
          }`}
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold tracking-[0.02em] text-foreground">
              {row.title}
              {!row.isActive && (
                <span className="ml-2 text-[11px] font-normal text-muted-foreground">hidden</span>
              )}
            </p>
            {row.subtitle && (
              <p className="mt-0.5 truncate text-[12px] text-muted-foreground">{row.subtitle}</p>
            )}
          </div>
          {row.tags && row.tags.length > 0 && (
            <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
              {row.tags.map((tag) => (
                <span
                  key={tag}
                  className="bg-surface-3 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase"
                >
                  {tag}
                </span>
              ))}
            </div>
          )}
        </Link>
      ))}
    </div>
  );
}
