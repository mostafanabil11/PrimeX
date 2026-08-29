"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { MapPin, User } from "lucide-react";
import { getMyBookings, cancelBooking } from "@/lib/api/schedule";
import { getCurrentMembership } from "@/lib/api/membership";
import { apiErrorMessage } from "@/lib/api-error";
import {
  formatLocalDate,
  sessionTime,
  sessionEndTime,
  type Booking,
} from "@/types/schedule";
import { formatMembershipDate } from "@/lib/gym-format";

const TIMEZONE = "Africa/Cairo";

export default function MyClassesPage() {
  const [scope, setScope] = useState<"upcoming" | "past">("upcoming");

  const { data: bookings, isLoading } = useQuery({
    queryKey: ["bookings", scope],
    queryFn: () => getMyBookings(scope),
  });

  const { data: membership } = useQuery({
    queryKey: ["membership", "current"],
    queryFn: getCurrentMembership,
  });

  const credits = membership?.planSnapshot.classAccessMode === "credits";

  return (
    <div className="flex flex-col gap-stack-sm">
      <h1 className="font-display text-4xl tracking-[-0.02em] text-foreground uppercase md:text-5xl">
        My classes
      </h1>

      {credits && membership && (
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 border border-border bg-surface-1 p-5">
          <span className="font-display text-3xl text-primary tabular-nums">
            {membership.classCredits.remaining}
          </span>
          <span className="text-[13px] text-foreground">
            {membership.classCredits.remaining === 1 ? "class left" : "classes left"} this month
          </span>
          {membership.classCredits.cycleEndsAt && (
            <span className="text-[12px] text-muted-foreground">
              · resets {formatMembershipDate(membership.classCredits.cycleEndsAt)}
            </span>
          )}
        </div>
      )}

      <div className="flex gap-2">
        {(["upcoming", "past"] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setScope(s)}
            className={`px-4 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors ${
              scope === s
                ? "bg-primary text-primary-foreground"
                : "border border-border text-muted-foreground hover:text-foreground"
            }`}
          >
            {s === "upcoming" ? "Upcoming" : "Past"}
          </button>
        ))}
      </div>

      {isLoading || !bookings ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : bookings.length === 0 ? (
        <div className="flex flex-col items-start gap-4 border border-dashed border-border p-8">
          <p className="text-body-md text-muted-foreground">
            {scope === "upcoming"
              ? "Nothing booked. The timetable is open two weeks ahead."
              : "No classes yet. Once you have trained with us they show up here."}
          </p>
          {scope === "upcoming" && (
            <Link
              href="/schedule"
              className="bg-primary px-6 py-3 font-mono text-[12px] font-semibold tracking-[0.08em] text-primary-foreground uppercase"
            >
              Browse the timetable
            </Link>
          )}
        </div>
      ) : (
        <div className="border-t border-border">
          {bookings.map((booking) => (
            <BookingRow key={booking._id} booking={booking} scope={scope} />
          ))}
        </div>
      )}
    </div>
  );
}

function BookingRow({ booking, scope }: { booking: Booking; scope: "upcoming" | "past" }) {
  const queryClient = useQueryClient();
  const session = booking.session;

  const cancel = useMutation({
    mutationFn: () => cancelBooking(booking._id),
    onSuccess: (result) => {
      toast.success(
        result.creditReturned
          ? "Cancelled — your class credit is back"
          : "Cancelled. This was inside the window, so the class still counts.",
      );
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
      queryClient.invalidateQueries({ queryKey: ["membership"] });
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not cancel that booking")),
  });

  // A session that was deleted outright leaves a booking pointing at nothing.
  // Rare, but rendering a crash instead of a row would be worse.
  if (!session?.classType) {
    return null;
  }

  const statusLabel: Record<Booking["status"], string> = {
    booked: "Booked",
    attended: "Attended",
    no_show: "Missed",
    cancelled: booking.cancelledByGym ? "Cancelled by us" : "Cancelled",
  };

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border py-4">
      <div className="w-28 shrink-0">
        <p className="font-display text-xl leading-none text-foreground tabular-nums">
          {sessionTime(session, TIMEZONE)}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground">
          {formatLocalDate(session.localDate).replace(/,/, "")}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <p className="text-[15px] font-semibold text-foreground">{session.classType.name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <MapPin className="size-3.5" strokeWidth={1.5} />
            {session.branch?.name}
            {session.room && ` · ${session.room}`}
          </span>
          {session.trainer && (
            <span className="flex items-center gap-1.5">
              <User className="size-3.5" strokeWidth={1.5} />
              {session.trainer.name}
            </span>
          )}
          <span className="tabular-nums">
            until {sessionEndTime(session, TIMEZONE)}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase ${
            booking.status === "attended"
              ? "bg-surface-3 text-primary"
              : booking.status === "no_show"
                ? "bg-surface-3 text-destructive"
                : "bg-surface-3 text-muted-foreground"
          }`}
        >
          {statusLabel[booking.status]}
        </span>

        {scope === "upcoming" && booking.status === "booked" && (
          <button
            type="button"
            disabled={cancel.isPending}
            onClick={() => {
              if (confirm(`Cancel your place on ${session.classType.name}?`)) cancel.mutate();
            }}
            className="border border-border px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:border-foreground hover:text-foreground disabled:opacity-40"
          >
            {cancel.isPending ? "…" : "Cancel"}
          </button>
        )}
      </div>
    </div>
  );
}
