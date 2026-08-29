"use client";

import { useQuery } from "@tanstack/react-query";
import { getMyInvoices } from "@/lib/api/membership";
import { InvoiceRow } from "@/components/account/membership-card";
import { formatPrice } from "@/lib/format";

export default function PaymentsPage() {
  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices", "mine"],
    queryFn: getMyInvoices,
  });

  if (isLoading || !invoices) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  const paidTotal = invoices
    .filter((i) => i.paymentStatus === "paid")
    .reduce((sum, i) => sum + i.totalMinorUnits, 0);

  return (
    <div className="flex flex-col gap-stack-sm">
      <h1 className="font-display text-4xl tracking-[-0.02em] text-foreground uppercase md:text-5xl">
        Payments
      </h1>

      {invoices.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Nothing here yet. Receipts appear as soon as you have paid for something.
        </p>
      ) : (
        <>
          <div className="border border-border bg-surface-1 p-5">
            <p className="text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Paid to date
            </p>
            <p className="mt-1 font-display text-3xl text-foreground tabular-nums">
              {formatPrice(paidTotal)}
            </p>
          </div>

          <div className="border-t border-border">
            {invoices.map((invoice) => (
              <InvoiceRow key={invoice._id} invoice={invoice} />
            ))}
          </div>

          <p className="text-[12px] text-muted-foreground">
            Need a printed receipt? Ask at the front desk and quote the reference.
          </p>
        </>
      )}
    </div>
  );
}
