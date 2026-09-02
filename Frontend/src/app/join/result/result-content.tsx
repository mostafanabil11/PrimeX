"use client";

import { Link } from "@/i18n/navigation";
import { useSearchParams } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { Check, Clock, X } from "lucide-react";
import { getCurrentMembership } from "@/lib/api/membership";
import { CtaButton } from "@/components/public/section";
import { formatMembershipDate } from "@/lib/gym-format";
import { InstapayInstructions } from "@/components/join/instapay-details";

export function JoinResultContent() {
  const params = useSearchParams();
  const status = params.get("status");
  const invoiceNumber = params.get("invoice");

  // The webhook is the source of truth and may land a moment after the
  // browser gets back, so this polls briefly rather than trusting the redirect
  // alone. A member who sees "not active yet" on a payment that worked is a
  // support call we can avoid for the cost of a few requests.
  const { data: membership, isLoading } = useQuery({
    queryKey: ["membership", "current"],
    queryFn: getCurrentMembership,
    enabled: status === "success",
    refetchInterval: (query) => (query.state.data ? false : 2000),
    // Stop after roughly twenty seconds; past that something is genuinely wrong
    // and polling harder will not fix it.
    retry: false,
  });

  if (status === "pending-instapay") {
    return (
      <Panel
        icon={<Clock className="size-8 text-primary" strokeWidth={1.5} />}
        title="Almost there"
        body="Your place is reserved. Two quick steps and your membership is active."
      >
        {invoiceNumber && (
          <p className="text-[13px] text-muted-foreground">
            Invoice <span className="text-foreground">{invoiceNumber}</span> — quote this if you
            message us.
          </p>
        )}
        <div className="w-full border border-border bg-surface-2 p-5">
          <InstapayInstructions />
        </div>
        <CtaButton href="/account">Go to my account</CtaButton>
      </Panel>
    );
  }

  if (status === "pending-cash") {
    return (
      <Panel
        icon={<Clock className="size-8 text-primary" strokeWidth={1.5} />}
        title="Reserved"
        body="Your membership is held. Pay at the front desk on your first visit and it activates straight away."
      >
        {invoiceNumber && (
          <p className="text-[13px] text-muted-foreground">
            Quote reference <span className="text-foreground">{invoiceNumber}</span> at the desk.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <CtaButton href="/account">Go to my account</CtaButton>
          <CtaButton href="/contact" variant="outline">
            Find us
          </CtaButton>
        </div>
      </Panel>
    );
  }

  // A card join that came back without a Paymob iframe.
  //
  // This needs its own panel rather than falling through to the failure one at
  // the bottom, which says "nothing has been charged and your place is not
  // held". Here an invoice HAS been raised and the subscription is pending —
  // telling someone their place is not held when it is invites them to join a
  // second time and leaves the desk with two invoices for one member.
  if (status === "pending-card") {
    return (
      <Panel
        icon={<Clock className="size-8 text-primary" strokeWidth={1.5} />}
        title="Held, not yet paid"
        body="We could not open the payment page, but your place is reserved. Nothing has been charged yet."
      >
        {invoiceNumber && (
          <p className="text-[13px] text-muted-foreground">
            Invoice <span className="text-foreground">{invoiceNumber}</span> — quote this if you
            message us.
          </p>
        )}
        <div className="flex flex-wrap gap-3">
          <CtaButton href="/contact">Get help</CtaButton>
          <CtaButton href="/account" variant="outline">
            Go to my account
          </CtaButton>
        </div>
      </Panel>
    );
  }

  if (status === "success") {
    if (isLoading || !membership) {
      return (
        <Panel
          icon={<Clock className="size-8 text-primary" strokeWidth={1.5} />}
          title="Confirming your payment"
          body="This takes a few seconds. You do not need to do anything."
        >
          <div className="h-1 w-40 animate-pulse bg-primary" />
        </Panel>
      );
    }

    return (
      <Panel
        icon={<Check className="size-8 text-primary" strokeWidth={2} />}
        title="You are in"
        body={`Your ${membership.planSnapshot.name} membership is active.`}
      >
        <dl className="flex flex-col gap-2 text-[13px]">
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Starts</dt>
            <dd className="text-foreground">{formatMembershipDate(membership.startsAt)}</dd>
          </div>
          <div className="flex justify-between gap-6">
            <dt className="text-muted-foreground">Runs until</dt>
            <dd className="text-foreground">{formatMembershipDate(membership.endsAt)}</dd>
          </div>
          {invoiceNumber && (
            <div className="flex justify-between gap-6">
              <dt className="text-muted-foreground">Receipt</dt>
              <dd className="text-foreground">{invoiceNumber}</dd>
            </div>
          )}
        </dl>
        <p className="text-[13px] text-muted-foreground">
          Bring photo ID to your first visit and the front desk will get you set up.
        </p>
        <CtaButton href="/account">Go to my account</CtaButton>
      </Panel>
    );
  }

  return (
    <Panel
      icon={<X className="size-8 text-destructive" strokeWidth={2} />}
      title="Payment did not go through"
      body="Nothing has been charged and your place is not held. This is usually the bank rather than the card, so it is worth trying again."
    >
      <div className="flex flex-wrap gap-3">
        <CtaButton href="/join">Try again</CtaButton>
        <CtaButton href="/contact" variant="outline">
          Get help
        </CtaButton>
      </div>
      <p className="text-[13px] text-muted-foreground">
        You can also{" "}
        <Link href="/join" className="text-primary-soft underline">
          reserve a place and pay at the gym
        </Link>{" "}
        instead.
      </p>
    </Panel>
  );
}

function Panel({
  icon,
  title,
  body,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="mx-auto flex max-w-xl flex-col items-start gap-5 border border-border bg-surface-1 p-8">
      {icon}
      <h1 className="font-display text-4xl leading-[0.95] tracking-[-0.02em] text-foreground uppercase">
        {title}
      </h1>
      <p className="text-body-md text-muted-foreground">{body}</p>
      {children}
    </div>
  );
}

