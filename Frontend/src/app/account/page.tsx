"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCurrentMembership, getMyInvoices } from "@/lib/api/membership";
import { getMyBookings } from "@/lib/api/schedule";
import { formatLocalDate, sessionTime } from "@/types/schedule";
import { useCurrentUser } from "@/hooks/use-current-user";
import { MembershipCard, NoMembershipCard, InvoiceRow } from "@/components/account/membership-card";

export default function AccountDashboardPage() {
  const { data: user } = useCurrentUser();

  const { data: membership, isLoading: loadingMembership } = useQuery({
    queryKey: ["membership", "current"],
    queryFn: getCurrentMembership,
  });

  const { data: invoices } = useQuery({
    queryKey: ["invoices", "mine"],
    queryFn: getMyInvoices,
  });

  const recent = invoices?.slice(0, 3) ?? [];

  return (
    <div className="flex flex-col gap-stack-sm">
      <div>
        <h1 className="font-display text-4xl tracking-[-0.02em] text-foreground uppercase md:text-5xl">
          Welcome back{user ? `, ${user.firstName}` : ""}
        </h1>
      </div>

      {loadingMembership ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : membership ? (
        <MembershipCard subscription={membership} />
      ) : (
        <NoMembershipCard />
      )}

      <UpcomingClasses />

      {recent.length > 0 && (
        <section className="flex flex-col gap-4">
          <div className="flex items-baseline justify-between gap-4">
            <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
              Recent payments
            </h2>
            <Link
              href="/account/payments"
              className="font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-soft uppercase hover:underline"
            >
              See all →
            </Link>
          </div>
          <div className="border-t border-border">
            {recent.map((invoice) => (
              <InvoiceRow key={invoice._id} invoice={invoice} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}


// The next few sessions, kept short — the full list lives on My Classes.
function UpcomingClasses() {
  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", "upcoming"],
    queryFn: () => getMyBookings("upcoming"),
  });

  if (isLoading) {
    return <div className="h-32 animate-pulse bg-muted" />;
  }

  const next = (bookings ?? []).filter((b) => b.session?.classType).slice(0, 3);

  return (
    <section className="flex flex-col gap-4">
      <div className="flex items-baseline justify-between gap-4">
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
          Upcoming classes
        </h2>
        <Link
          href="/account/classes"
          className="font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-soft uppercase hover:underline"
        >
          See all →
        </Link>
      </div>

      {next.length === 0 ? (
        <div className="flex flex-col items-start gap-3 border border-dashed border-border p-6">
          <p className="text-[14px] text-muted-foreground">
            Nothing booked yet. The timetable is open two weeks ahead.
          </p>
          <Link
            href="/schedule"
            className="bg-primary px-5 py-2.5 font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-foreground uppercase"
          >
            Find a class
          </Link>
        </div>
      ) : (
        <div className="border-t border-border">
          {next.map((booking) => (
            <div
              key={booking._id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3.5"
            >
              <div>
                <p className="text-[14px] font-semibold text-foreground">
                  {booking.session.classType.name}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {formatLocalDate(booking.session.localDate)} ·{" "}
                  {sessionTime(booking.session, "Africa/Cairo")} · {booking.session.branch?.name}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
