"use client";

import Link from "next/link";
import { formatPrice } from "@/lib/format";
import { formatMembershipDate, formatMembershipDateShort } from "@/lib/gym-format";
import {
  daysRemaining,
  describeSnapshotAccess,
  STATUS_LABELS,
  type Subscription,
} from "@/types/membership";

// Status carries meaning, so it gets form as well as a word — an expiring
// membership needs to read as urgent at a glance, not after reading a date.
const STATUS_STYLES: Record<Subscription["status"], string> = {
  active: "bg-primary text-primary-foreground",
  pending: "bg-surface-3 text-foreground",
  frozen: "bg-surface-3 text-foreground",
  expired: "bg-surface-3 text-muted-foreground",
  cancelled: "bg-surface-3 text-muted-foreground",
};

export function MembershipCard({ subscription }: { subscription: Subscription }) {
  const left = daysRemaining(subscription.endsAt);
  const isActive = subscription.status === "active";
  // Two weeks is when the first reminder email goes out, so the card starts
  // nagging at the same moment rather than contradicting it.
  const expiringSoon = isActive && left <= 14;

  const branchName =
    typeof subscription.branch === "object" ? subscription.branch.name : null;

  return (
    <div
      className={`flex flex-col gap-5 border p-6 ${
        expiringSoon ? "border-primary bg-surface-2" : "border-border bg-surface-1"
      }`}
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="font-mono text-[11px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Your membership
          </p>
          <h2 className="mt-1 font-display text-3xl tracking-[-0.02em] text-foreground uppercase">
            {subscription.planSnapshot.name}
          </h2>
        </div>
        <span
          className={`px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.1em] uppercase ${STATUS_STYLES[subscription.status]}`}
        >
          {STATUS_LABELS[subscription.status]}
        </span>
      </div>

      {isActive && (
        <div>
          <p className="font-display text-5xl leading-none text-primary tabular-nums">{left}</p>
          <p className="mt-1 text-[13px] text-muted-foreground">
            {left === 1 ? "day left" : "days left"} · ends {formatMembershipDate(subscription.endsAt)}
          </p>
        </div>
      )}

      {subscription.status === "pending" && (
        <p className="text-[14px] text-foreground">
          Pay at the front desk on your next visit and this activates straight away.
        </p>
      )}

      {subscription.status === "frozen" && (
        <p className="text-[14px] text-foreground">
          Frozen. Your end date has moved out by the same number of days, so nothing is lost.
        </p>
      )}

      <dl className="grid gap-x-6 gap-y-3 border-t border-border pt-5 text-[13px] sm:grid-cols-2">
        <Row label="Started" value={formatMembershipDate(subscription.startsAt)} />
        <Row label="Runs until" value={formatMembershipDate(subscription.endsAt)} />
        {branchName && <Row label="Home branch" value={branchName} />}
        <Row label="Classes" value={describeSnapshotAccess(subscription.planSnapshot)} />
        <Row
          label="Branches"
          value={
            subscription.planSnapshot.branchAccess === "all" ? "Every branch" : "Home branch only"
          }
        />
        {subscription.planSnapshot.classAccessMode === "credits" && (
          <Row
            label="Classes left this month"
            value={String(subscription.classCredits.remaining)}
          />
        )}
        {subscription.planSnapshot.guestPasses > 0 && (
          <Row label="Guest passes left" value={String(subscription.guestPassesRemaining)} />
        )}
        {subscription.planSnapshot.freezeDaysAllowed > 0 && (
          <Row
            label="Freeze days left"
            value={String(
              subscription.planSnapshot.freezeDaysAllowed - subscription.freezeDaysUsed,
            )}
          />
        )}
      </dl>

      {expiringSoon && (
        <div className="flex flex-col gap-3 border-t border-border pt-5">
          <p className="text-[14px] text-foreground">
            {left <= 1
              ? "This is your last day. Renew to keep training without a break."
              : `Your membership ends in ${left} days. Nothing renews automatically.`}
          </p>
          <Link
            href="/join"
            className="w-fit bg-primary px-6 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
          >
            Renew now
          </Link>
        </div>
      )}
    </div>
  );
}

export function NoMembershipCard() {
  return (
    <div className="flex flex-col items-start gap-4 border border-dashed border-border p-8">
      <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground uppercase">
        No membership yet
      </h2>
      <p className="max-w-md text-body-md text-muted-foreground">
        You have an account but nothing to train on. Pick a plan and you can be on the floor today.
      </p>
      <div className="flex flex-wrap gap-3">
        <Link
          href="/join"
          className="bg-primary px-6 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-opacity hover:opacity-90"
        >
          Choose a plan
        </Link>
        <Link
          href="/membership"
          className="border border-border px-6 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] text-foreground uppercase"
        >
          Compare plans
        </Link>
      </div>
    </div>
  );
}

export function InvoiceRow({ invoice }: { invoice: import("@/types/membership").Invoice }) {
  const isPaid = invoice.paymentStatus === "paid";

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-b border-border py-4 last:border-0">
      <div className="min-w-0">
        <p className="text-[13px] font-semibold text-foreground">{invoice.invoiceNumber}</p>
        <p className="text-[12px] text-muted-foreground">
          {formatMembershipDateShort(invoice.createdAt)}
          {" · "}
          {invoice.lines.map((l) => l.description).join(", ")}
        </p>
      </div>
      <div className="flex items-center gap-4">
        <span
          className={`px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase ${
            isPaid ? "bg-surface-3 text-primary" : "bg-surface-3 text-muted-foreground"
          }`}
        >
          {invoice.paymentStatus === "pending" ? "Awaiting payment" : invoice.paymentStatus}
        </span>
        <span className="text-[14px] font-semibold text-foreground tabular-nums">
          {formatPrice(invoice.totalMinorUnits)}
        </span>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase">
        {label}
      </dt>
      <dd className="mt-0.5 text-foreground">{value}</dd>
    </div>
  );
}
