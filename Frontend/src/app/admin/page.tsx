"use client";

import { Link } from "@/i18n/navigation";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, TrendingDown, Inbox, ArrowRight } from "lucide-react";
import { getGymDashboard, getFunnelInsights, type FunnelInsights } from "@/lib/api/admin";
import { formatPrice } from "@/lib/format";
import { formatMembershipDate } from "@/lib/gym-format";
import { chaseReservation } from "@/lib/whatsapp-messages";
import { daysRemaining } from "@/types/membership";
import { RecordCashButton } from "@/components/admin/record-cash-button";
import { AdminContactButtons } from "@/components/admin/contact-buttons";
import { MEMBERSHIP_TRACKING_ENABLED, CLASS_BOOKING_ENABLED } from "@/lib/features";

export default function AdminDashboardPage() {
  const { data, isLoading } = useQuery({ queryKey: ["admin", "gym-dashboard"], queryFn: getGymDashboard });
  const { data: insights } = useQuery({
    queryKey: ["admin", "funnel"],
    queryFn: () => getFunnelInsights(30),
    enabled: MEMBERSHIP_TRACKING_ENABLED,
  });

  return (
    <div>
      <h1 className="mb-8 font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
        Dashboard
      </h1>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : (
        <div className="flex flex-col gap-10">
          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2 lg:grid-cols-4">
            {MEMBERSHIP_TRACKING_ENABLED && (
              <>
                <Stat label="Active members" value={String(data.activeMembers)} />
                <Stat
                  label="New this month"
                  value={String(data.newMembersThisMonth)}
                  trend={trendOf(data.newMembersThisMonth, data.newMembersLastMonth)}
                />
                <Stat label="Revenue this month" value={formatPrice(data.revenueThisMonthMinorUnits)} />
              </>
            )}
            {CLASS_BOOKING_ENABLED && (
              <Stat
                label="Today's class fill rate"
                value={data.classFillRateToday === null ? "—" : `${data.classFillRateToday}%`}
                hint={data.classFillRateToday === null ? "Nothing scheduled today" : undefined}
              />
            )}
          </div>

          <div className="grid grid-cols-1 gap-px bg-border sm:grid-cols-2">
            {CLASS_BOOKING_ENABLED && (
              <Stat label="Bookings today" value={String(data.todaysBookingCount)} />
            )}
            {/* The headline number in showcase mode: with no online booking or
                payment, enquiries are the whole funnel. */}
            <div className="flex items-center justify-between gap-4 bg-background px-6 py-6">
              <div>
                <p className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
                  Open enquiries
                </p>
                <p className="font-display text-4xl text-foreground tabular-nums">
                  {data.openEnquiries}
                </p>
              </div>
              {data.openEnquiries > 0 && (
                <Link
                  href="/admin/enquiries"
                  className="flex items-center gap-1.5 text-[12px] font-semibold tracking-[0.06em] text-primary-soft uppercase hover:underline"
                >
                  <Inbox className="size-4" strokeWidth={1.5} />
                  Review
                </Link>
              )}
            </div>
          </div>

          {insights && <AtRiskSection atRisk={insights.atRisk} />}

          {insights && <FunnelSection funnel={insights.funnel} days={insights.days} />}

          {MEMBERSHIP_TRACKING_ENABLED && (
            <section>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
                  Expiring in the next 7 days
                </h2>
                <Link
                  href="/admin/memberships"
                  className="text-[12px] font-semibold tracking-[0.08em] text-primary-soft uppercase hover:underline"
                >
                  All memberships →
                </Link>
              </div>

              {data.expiringSoon.length === 0 ? (
                <p className="text-[13px] text-muted-foreground">Nobody expiring this week.</p>
              ) : (
                <div className="border-t border-border">
                  {data.expiringSoon.map((sub) => (
                    <Link
                      key={sub._id}
                      href={sub.member ? `/admin/customers/${sub.member._id}` : "/admin/memberships"}
                      className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3.5 hover:bg-surface-1"
                    >
                      <div>
                        <p className="text-[14px] font-semibold text-foreground">
                          {sub.member ? `${sub.member.firstName} ${sub.member.lastName}` : "Unknown member"}
                        </p>
                        <p className="text-[12px] text-muted-foreground">
                          {sub.planSnapshot.name} · ends {formatMembershipDate(sub.endsAt)}
                        </p>
                      </div>
                      <span className="bg-surface-3 px-2.5 py-1 text-[11px] font-semibold text-primary-soft tabular-nums">
                        {daysRemaining(sub.endsAt)}d left
                      </span>
                    </Link>
                  ))}
                </div>
              )}
            </section>
          )}
        </div>
      )}
    </div>
  );
}

const BUCKET_LABELS: Record<string, string> = {
  "0": "0–2 days",
  "3": "3–7 days",
  "8": "8–14 days",
  older: "15+ days",
};

/**
 * Money that was agreed and never collected.
 *
 * Deliberately above the funnel: it is the only thing on this page that is
 * actionable right now. Each row carries a phone number, a WhatsApp chase and
 * the same "confirm as paid" button the memberships table uses, so the whole
 * loop closes without leaving the dashboard.
 */
function AtRiskSection({ atRisk }: { atRisk: FunnelInsights["atRisk"] }) {
  if (atRisk.count === 0) {
    return (
      <section>
        <h2 className="mb-4 font-display text-xl tracking-[-0.02em] text-foreground uppercase">
          Awaiting payment
        </h2>
        <p className="text-[13px] text-muted-foreground">
          Nothing outstanding — every reservation has been settled.
        </p>
      </section>
    );
  }

  return (
    <section>
      <div className="mb-4 flex flex-wrap items-baseline justify-between gap-3">
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
          Awaiting payment
        </h2>
        <span className="font-display text-2xl text-primary tabular-nums">
          {formatPrice(atRisk.totalMinorUnits)}
        </span>
      </div>

      <div className="mb-5 grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
        {atRisk.buckets.map((b) => (
          <div key={String(b._id)} className="bg-background px-4 py-3">
            <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
              {BUCKET_LABELS[String(b._id)] ?? String(b._id)}
            </p>
            <p className="mt-1 text-[15px] font-semibold text-foreground tabular-nums">
              {formatPrice(b.total)}
            </p>
            <p className="text-[12px] text-muted-foreground">
              {b.count} {b.count === 1 ? "membership" : "memberships"}
            </p>
          </div>
        ))}
      </div>

      <div className="border-t border-border">
        {atRisk.oldest.map((row) => {
          const name = [row.firstName, row.lastName].filter(Boolean).join(" ") || "Unknown member";
          return (
            <div
              key={row.invoiceId}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3.5"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground">
                  {name}
                  {row.referenceCode && (
                    <span className="ml-2 font-mono text-[12px] font-normal tracking-[0.08em] text-muted-foreground">
                      {row.referenceCode}
                    </span>
                  )}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {row.planName ?? "Membership"} · {formatPrice(row.totalMinorUnits)} ·{" "}
                  {row.ageDays === 0 ? "today" : `${row.ageDays}d ago`}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                {/* Shared with the memberships table — see AdminContactButtons.
                    This pair used to be written out here and nowhere else,
                    which is why the screen staff actually chase payments from
                    did not have it. */}
                {row.phone && (
                  <AdminContactButtons
                    phone={row.phone}
                    name={name}
                    message={chaseReservation(row.referenceCode, row.firstName ?? "there")}
                  />
                )}
                <RecordCashButton
                  invoiceId={row.invoiceId}
                  invoiceNumber={row.invoiceNumber}
                  amount={formatPrice(row.totalMinorUnits)}
                  method={row.paymentMethod}
                />
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

/**
 * Clicked → reserved → paid.
 *
 * The middle number is the one worth watching: putting a form between the
 * plan button and the WhatsApp handoff was a deliberate trade, and this is
 * what says whether it cost more conversations than it saved retyping.
 */
function FunnelSection({ funnel, days }: { funnel: FunnelInsights["funnel"]; days: number }) {
  return (
    <section>
      <h2 className="mb-1 font-display text-xl tracking-[-0.02em] text-foreground uppercase">
        Website funnel
      </h2>
      <p className="mb-4 text-[12px] text-muted-foreground">
        Last {days} days · {funnel.whatsappClicks} other WhatsApp{" "}
        {funnel.whatsappClicks === 1 ? "click" : "clicks"} from the header and homepage
      </p>

      <div className="flex flex-wrap items-stretch gap-px bg-border">
        <FunnelStep label="Clicked a plan" value={funnel.reserveStarts} />
        <FunnelArrow pct={funnel.startToReservePct} />
        <FunnelStep label="Reserved" value={funnel.reservations} />
        <FunnelArrow pct={funnel.reserveToPaidPct} />
        <FunnelStep label="Paid" value={funnel.converted} />
      </div>
    </section>
  );
}

function FunnelStep({ label, value }: { label: string; value: number }) {
  return (
    <div className="min-w-32 flex-1 bg-background px-5 py-4">
      <p className="text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
      </p>
      <p className="mt-1 font-display text-3xl text-foreground tabular-nums">{value}</p>
    </div>
  );
}

function FunnelArrow({ pct }: { pct: number | null }) {
  return (
    <div className="flex flex-col items-center justify-center bg-background px-3 py-4">
      <ArrowRight className="size-4 text-muted-foreground" strokeWidth={1.5} />
      <span className="mt-1 text-[12px] font-semibold text-primary-soft tabular-nums">
        {pct === null ? "—" : `${pct}%`}
      </span>
    </div>
  );
}

function trendOf(thisMonth: number, lastMonth: number): "up" | "down" | "flat" {
  if (thisMonth > lastMonth) return "up";
  if (thisMonth < lastMonth) return "down";
  return "flat";
}

function Stat({
  label,
  value,
  hint,
  trend,
}: {
  label: string;
  value: string;
  hint?: string;
  trend?: "up" | "down" | "flat";
}) {
  return (
    <div className="bg-background px-6 py-6">
      <p className="mb-2 flex items-center gap-1.5 text-[11px] font-semibold tracking-[0.1em] text-muted-foreground uppercase">
        {label}
        {trend === "up" && <TrendingUp className="size-3.5 text-primary" strokeWidth={2} />}
        {trend === "down" && <TrendingDown className="size-3.5 text-muted-foreground" strokeWidth={2} />}
      </p>
      <p className="font-display text-4xl text-foreground tabular-nums">{value}</p>
      {hint && <p className="mt-1 text-[12px] text-muted-foreground">{hint}</p>}
    </div>
  );
}
