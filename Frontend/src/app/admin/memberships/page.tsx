"use client";

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getInvoicesAdmin } from "@/lib/api/membership";
import { formatPrice } from "@/lib/format";
import { formatMembershipDateShort, paymentMethodLabel, isSettledByStaff } from "@/lib/gym-format";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { RecordCashButton } from "@/components/admin/record-cash-button";
import type { PaymentStatus } from "@/types/membership";

const STATUS_FILTERS: Array<{ value: PaymentStatus | ""; label: string }> = [
  { value: "", label: "All payments" },
  { value: "pending", label: "Awaiting payment" },
  { value: "paid", label: "Paid" },
  { value: "failed", label: "Failed" },
  { value: "refunded", label: "Refunded" },
];

const STATUS_STYLES: Record<PaymentStatus, string> = {
  paid: "bg-surface-3 text-primary",
  pending: "bg-primary text-primary-foreground",
  failed: "bg-surface-3 text-destructive",
  refunded: "bg-surface-3 text-muted-foreground",
};

export default function AdminMembershipsPage() {
  const [status, setStatus] = useState<PaymentStatus | "">("");
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");

  // Debounced so pasting a reference does not fire a request per character.
  const [q, setQ] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => {
      setQ(search.trim());
      setPage(1);
    }, 350);
    return () => window.clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "invoices", status, q, page],
    queryFn: () => getInvoicesAdmin({ status: status || undefined, q: q || undefined, page }),
  });

  return (
    <div>
      <AdminPageHeader
        title="Memberships &amp; payments"
        count={data?.total}
        newHref="/admin/memberships/new"
        newLabel="Record a membership"
      />

      {data && (
        <div className="mb-6 grid gap-px bg-border sm:grid-cols-2">
          <Stat label="Collected to date" value={formatPrice(data.paidTotalMinorUnits)} />
          {/* Counted across every invoice now, not just the current page —
              "3 on this page" was not a number anyone could act on. */}
          <Stat
            label="Awaiting payment"
            value={formatPrice(data.pendingTotalMinorUnits)}
            hint={`${data.pendingCount} ${data.pendingCount === 1 ? "membership" : "memberships"}`}
          />
        </div>
      )}

      <div className="mb-6 flex flex-wrap items-center gap-2">
        {STATUS_FILTERS.map((f) => (
          <button
            key={f.label}
            type="button"
            onClick={() => {
              setStatus(f.value);
              setPage(1);
            }}
            className={`px-3.5 py-2 text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors ${
              status === f.value
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {f.label}
          </button>
        ))}

        {/* The reference is what a member quotes in a WhatsApp thread, so it
            is the first thing staff will paste in here. */}
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Reference or invoice no."
          className="ml-auto w-56 border border-border bg-surface-1 px-3 py-2 text-[13px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none"
        />
      </div>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : data.invoices.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing matches that filter.</p>
      ) : (
        <>
          <div className="overflow-x-auto border-t border-b border-border">
            <table className="w-full min-w-[46rem] text-[13px]">
              <thead>
                <tr className="border-b border-border">
                  {["Ref", "Invoice", "Member", "For", "Method", "Status", "Amount", ""].map((h) => (
                    <th
                      key={h}
                      scope="col"
                      className="px-3 py-3 text-left text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.invoices.map((invoice) => {
                  const subscription =
                    typeof invoice.subscription === "object" ? invoice.subscription : null;
                  const memberObj = typeof invoice.member === "object" ? invoice.member : null;
                  const member = memberObj
                    ? `${memberObj.firstName} ${memberObj.lastName}`
                    : (invoice.email ?? "—");
                  // Email is nullable now that members can be signed up at the
                  // desk without one, so the phone is the fallback contact.
                  const contact = invoice.email ?? memberObj?.phone ?? invoice.phone ?? null;

                  return (
                    <tr key={invoice._id} className="border-b border-border last:border-0">
                      <td className="px-3 py-3.5 align-top whitespace-nowrap">
                        {subscription?.referenceCode ? (
                          <span className="font-mono text-[13px] font-semibold tracking-[0.08em] text-foreground">
                            {subscription.referenceCode}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                        <SourceBadge origin={subscription?.origin ?? null} />
                      </td>
                      <td className="px-3 py-3.5 align-top whitespace-nowrap">
                        <span className="font-mono font-medium text-foreground">{invoice.invoiceNumber}</span>
                        <span className="mt-0.5 block text-[12px] text-muted-foreground">
                          {formatMembershipDateShort(invoice.createdAt)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 align-top">
                        <span className="text-foreground">{member}</span>
                        {contact && (
                          <span className="mt-0.5 block text-[12px] break-all text-muted-foreground">
                            {contact}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-3.5 align-top text-muted-foreground">
                        {invoice.lines.map((l) => l.description).join(", ")}
                      </td>
                      <td className="px-3 py-3.5 align-top whitespace-nowrap text-muted-foreground">
                        {paymentMethodLabel(invoice.paymentMethod)}
                      </td>
                      <td className="px-3 py-3.5 align-top whitespace-nowrap">
                        <span
                          className={`px-2 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase ${STATUS_STYLES[invoice.paymentStatus]}`}
                        >
                          {invoice.paymentStatus === "pending"
                            ? "Awaiting"
                            : invoice.paymentStatus}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right align-top whitespace-nowrap text-foreground tabular-nums">
                        {formatPrice(invoice.totalMinorUnits)}
                      </td>
                      <td className="px-3 py-3.5 align-top whitespace-nowrap">
                        {/* Off-system methods only. A pending card invoice is
                            between the member and Paymob — marking it paid by
                            hand would activate a membership nobody was
                            charged for. */}
                        {invoice.paymentStatus === "pending" &&
                          isSettledByStaff(invoice.paymentMethod) && (
                            <RecordCashButton
                              invoiceId={invoice._id}
                              invoiceNumber={invoice.invoiceNumber}
                              amount={formatPrice(invoice.totalMinorUnits)}
                              method={invoice.paymentMethod}
                            />
                          )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {data.totalPages > 1 && (
            <div className="mt-6 flex items-center gap-3">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage(page - 1)}
                className="border border-border px-4 py-2 text-[12px] font-semibold tracking-[0.06em] text-foreground uppercase disabled:opacity-40"
              >
                Previous
              </button>
              <span className="text-[12px] text-muted-foreground tabular-nums">
                Page {data.page} of {data.totalPages}
              </span>
              <button
                type="button"
                disabled={page >= data.totalPages}
                onClick={() => setPage(page + 1)}
                className="border border-border px-4 py-2 text-[12px] font-semibold tracking-[0.06em] text-foreground uppercase disabled:opacity-40"
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

/**
 * Where this membership came from.
 *
 * Nothing finer than website-vs-desk: the useful question is whether the site
 * is bringing people in, and which page they landed on was deliberately not
 * tracked. Older rows predate the field and honestly say nothing.
 */
function SourceBadge({ origin }: { origin: string | null }) {
  if (!origin) return null;

  const isWebsite = origin === "website";
  return (
    <span
      className={`mt-1 block w-fit px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] uppercase ${
        isWebsite ? "bg-surface-3 text-primary" : "bg-surface-3 text-muted-foreground"
      }`}
    >
      {isWebsite ? "Website" : "Front desk"}
    </span>
  );
}

function Stat({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="bg-background px-5 py-4">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-foreground tabular-nums">{value}</p>
      {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
