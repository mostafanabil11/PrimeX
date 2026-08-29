"use client";

import { use } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft } from "lucide-react";
import { getCustomer } from "@/lib/api/admin";
import {
  getMembershipsForMember,
  getInvoicesAdmin,
  unfreezeSubscription,
  cancelSubscription,
} from "@/lib/api/membership";
import { getBookingsForMember } from "@/lib/api/schedule";
import { RecordCashButton } from "@/components/admin/record-cash-button";
import { apiErrorMessage } from "@/lib/api-error";
import { formatPrice } from "@/lib/format";
import { formatMembershipDateShort, paymentMethodLabel, isSettledByStaff } from "@/lib/gym-format";
import { sessionTime, formatLocalDateShort } from "@/types/schedule";
import { STATUS_LABELS, daysRemaining, describeSnapshotAccess } from "@/types/membership";

export default function AdminCustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: customer, isLoading: loadingCustomer } = useQuery({
    queryKey: ["admin", "customer", id],
    queryFn: () => getCustomer(id),
  });

  const { data: memberships, isLoading: loadingMemberships } = useQuery({
    queryKey: ["admin", "customer", id, "memberships"],
    queryFn: () => getMembershipsForMember(id),
  });

  const { data: invoices, isLoading: loadingInvoices } = useQuery({
    queryKey: ["admin", "customer", id, "invoices"],
    queryFn: () => getInvoicesAdmin({ member: id }),
  });

  const { data: upcomingBookings } = useQuery({
    queryKey: ["admin", "customer", id, "bookings", "upcoming"],
    queryFn: () => getBookingsForMember(id, "upcoming"),
  });

  const { data: pastBookings } = useQuery({
    queryKey: ["admin", "customer", id, "bookings", "past"],
    queryFn: () => getBookingsForMember(id, "past"),
  });

  const invalidateMemberships = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "customer", id, "memberships"] });

  const unfreeze = useMutation({
    mutationFn: (subId: string) => unfreezeSubscription(subId),
    onSuccess: () => {
      toast.success("Membership unfrozen");
      invalidateMemberships();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not unfreeze this membership")),
  });

  const cancel = useMutation({
    mutationFn: (subId: string) => cancelSubscription(subId, "Cancelled by staff"),
    onSuccess: () => {
      toast.success("Membership cancelled");
      invalidateMemberships();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not cancel this membership")),
  });

  const current = memberships?.find((m) => m.status === "active" || m.status === "frozen" || m.status === "pending");
  const past = memberships?.filter((m) => m !== current) ?? [];

  return (
    <div>
      <Link
        href="/admin/customers"
        className="mb-6 flex w-fit items-center gap-1.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
      >
        <ArrowLeft className="size-3.5" strokeWidth={2} />
        Members
      </Link>

      {loadingCustomer || !customer ? (
        <div className="h-16 animate-pulse bg-muted" />
      ) : (
        <div className="mb-10 flex flex-wrap items-start justify-between gap-4 border-b border-border pb-6">
          <div>
            <h1 className="font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
              {customer.firstName} {customer.lastName}
            </h1>
            <p className="mt-1 text-[13px] text-muted-foreground">{customer.email}</p>
            {customer.phone && <p className="text-[13px] text-muted-foreground">{customer.phone}</p>}
          </div>
          <div className="text-right text-[12px] text-muted-foreground">
            <p>{customer.authProvider === "google" ? "Google account" : "Email/password"}</p>
            <p>{customer.isEmailVerified ? "Verified" : "Unverified"}</p>
            <p>Joined {formatMembershipDateShort(customer.createdAt)}</p>
          </div>
        </div>
      )}

      <div className="flex flex-col gap-12">
        <section>
          <h2 className="mb-4 font-display text-xl tracking-[-0.02em] text-foreground uppercase">Membership</h2>

          {loadingMemberships || !memberships ? (
            <div className="h-32 animate-pulse bg-muted" />
          ) : !current ? (
            <p className="text-[13px] text-muted-foreground">No active membership.</p>
          ) : (
            <div className="border border-border bg-surface-1 p-6">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="font-display text-2xl text-foreground uppercase">
                    {current.planSnapshot.name}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {describeSnapshotAccess(current.planSnapshot)}
                  </p>
                  <p className="mt-1 text-[13px] text-muted-foreground">
                    {formatMembershipDateShort(current.startsAt)} – {formatMembershipDateShort(current.endsAt)}
                    {current.status === "active" && ` · ${daysRemaining(current.endsAt)}d left`}
                  </p>
                </div>
                <span className="bg-surface-3 px-3 py-1.5 font-mono text-[11px] font-semibold tracking-[0.08em] text-primary-soft uppercase">
                  {STATUS_LABELS[current.status]}
                </span>
              </div>

              {current.status !== "cancelled" && current.status !== "expired" && (
                <div className="mt-5 flex flex-wrap gap-3 border-t border-border pt-5">
                  {current.status === "frozen" && (
                    <button
                      type="button"
                      disabled={unfreeze.isPending}
                      onClick={() => unfreeze.mutate(current._id)}
                      className="border border-border px-4 py-2 font-mono text-[11px] font-semibold tracking-[0.06em] text-foreground uppercase hover:border-foreground disabled:opacity-40"
                    >
                      Unfreeze now
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={cancel.isPending}
                    onClick={() => {
                      if (confirm("Cancel this membership? This cannot be undone.")) {
                        cancel.mutate(current._id);
                      }
                    }}
                    className="border border-destructive px-4 py-2 font-mono text-[11px] font-semibold tracking-[0.06em] text-destructive uppercase hover:bg-destructive hover:text-destructive-foreground disabled:opacity-40"
                  >
                    Cancel membership
                  </button>
                </div>
              )}
            </div>
          )}

          {past.length > 0 && (
            <div className="mt-4 border-t border-border">
              {past.map((m) => (
                <div
                  key={m._id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3.5 text-[13px]"
                >
                  <div>
                    <p className="font-medium text-foreground">{m.planSnapshot.name}</p>
                    <p className="text-muted-foreground">
                      {formatMembershipDateShort(m.startsAt)} – {formatMembershipDateShort(m.endsAt)}
                    </p>
                  </div>
                  <span className="bg-surface-3 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                    {STATUS_LABELS[m.status]}
                  </span>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl tracking-[-0.02em] text-foreground uppercase">Payments</h2>
          {loadingInvoices || !invoices ? (
            <div className="h-32 animate-pulse bg-muted" />
          ) : invoices.invoices.length === 0 ? (
            <p className="text-[13px] text-muted-foreground">No invoices yet.</p>
          ) : (
            <div className="border-t border-border">
              {invoices.invoices.map((inv) => (
                <div
                  key={inv._id}
                  className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3.5 text-[13px]"
                >
                  <div>
                    <p className="font-medium text-foreground">{inv.invoiceNumber}</p>
                    <p className="text-muted-foreground">
                      {formatMembershipDateShort(inv.createdAt)} ·{" "}
                      {paymentMethodLabel(inv.paymentMethod)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-semibold text-foreground tabular-nums">
                      {formatPrice(inv.totalMinorUnits)}
                    </span>
                    {inv.paymentStatus === "paid" ? (
                      <span className="bg-surface-3 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-primary-soft uppercase">
                        Paid
                      </span>
                    ) : inv.paymentStatus === "pending" && isSettledByStaff(inv.paymentMethod) ? (
                      <RecordCashButton
                        invoiceId={inv._id}
                        invoiceNumber={inv.invoiceNumber}
                        amount={formatPrice(inv.totalMinorUnits)}
                        method={inv.paymentMethod}
                      />
                    ) : (
                      <span className="bg-surface-3 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                        {inv.paymentStatus}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-4 font-display text-xl tracking-[-0.02em] text-foreground uppercase">Classes</h2>
          <BookingList title="Upcoming" bookings={upcomingBookings} empty="Nothing booked." />
          <div className="mt-6">
            <BookingList title="Past" bookings={pastBookings} empty="No class history." />
          </div>
        </section>
      </div>
    </div>
  );
}

function BookingList({
  title,
  bookings,
  empty,
}: {
  title: string;
  bookings: import("@/types/schedule").Booking[] | undefined;
  empty: string;
}) {
  return (
    <div>
      <h3 className="mb-2 font-mono text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">{title}</h3>
      {!bookings ? (
        <div className="h-16 animate-pulse bg-muted" />
      ) : bookings.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">{empty}</p>
      ) : (
        <div className="border-t border-border">
          {bookings.map((b) => (
            <div
              key={b._id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3 text-[13px]"
            >
              <div>
                <p className="font-medium text-foreground">{b.session.classType.name}</p>
                <p className="text-muted-foreground">
                  {formatLocalDateShort(b.session.localDate)} · {sessionTime(b.session, "Africa/Cairo")} ·{" "}
                  {b.session.branch.name}
                </p>
              </div>
              <span className="bg-surface-3 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                {b.status.replace("_", " ")}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
