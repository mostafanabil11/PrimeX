"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getMyMemberships } from "@/lib/api/membership";
import { MembershipCard, NoMembershipCard } from "@/components/account/membership-card";
import { STATUS_LABELS } from "@/types/membership";
import { formatMembershipDateShort } from "@/lib/gym-format";

export default function MyMembershipPage() {
  const { data: memberships, isLoading } = useQuery({
    queryKey: ["memberships", "mine"],
    queryFn: getMyMemberships,
  });

  if (isLoading || !memberships) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  // Anything the member can still use sits at the top; everything else is
  // history and reads as a list rather than a card.
  const current = memberships.find((m) => m.status === "active" || m.status === "frozen" || m.status === "pending");
  const past = memberships.filter((m) => m !== current);

  return (
    <div className="flex flex-col gap-stack-sm">
      <h1 className="font-display text-4xl tracking-[-0.02em] text-foreground uppercase md:text-5xl">
        My membership
      </h1>

      {current ? <MembershipCard subscription={current} /> : <NoMembershipCard />}

      {past.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
            Previously
          </h2>
          <div className="border-t border-border">
            {past.map((m) => (
              <div
                key={m._id}
                className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4 last:border-0"
              >
                <div>
                  <p className="text-[13px] font-semibold text-foreground">
                    {m.planSnapshot.name}
                  </p>
                  <p className="text-[12px] text-muted-foreground">
                    {formatMembershipDateShort(m.startsAt)} – {formatMembershipDateShort(m.endsAt)}
                  </p>
                </div>
                <span className="bg-surface-3 px-2 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                  {STATUS_LABELS[m.status]}
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="flex flex-col gap-3 border-t border-border pt-6">
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
          Need to change something?
        </h2>
        <p className="max-w-xl text-[14px] text-muted-foreground">
          Freezing, upgrading and cancelling all go through the front desk at the moment — it takes
          a minute and we can talk through what suits you.
        </p>
        <Link
          href="/contact"
          className="w-fit border border-border px-5 py-2.5 font-mono text-[12px] font-semibold tracking-[0.08em] text-foreground uppercase hover:border-foreground"
        >
          Get in touch
        </Link>
      </section>
    </div>
  );
}
