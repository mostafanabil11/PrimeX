"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Clock, MapPin, User, Users } from "lucide-react";
import { getSchedule, bookSession } from "@/lib/api/schedule";
import { useCurrentUser } from "@/hooks/use-current-user";
import { apiErrorMessage } from "@/lib/api-error";
import {
  availability,
  groupByDay,
  formatLocalDate,
  formatLocalDateShort,
  sessionTime,
  sessionEndTime,
  todayLocalDate,
  addLocalDays,
  type ClassSession,
  type Timetable as TimetableData,
} from "@/types/schedule";
import type { ClassType } from "@/types/gym";

const DAYS_SHOWN = 7;

const TONE_STYLES = {
  open: "bg-surface-3 text-muted-foreground",
  tight: "bg-surface-3 text-primary",
  full: "bg-surface-3 text-muted-foreground",
} as const;

export function Timetable({
  classTypes,
  initial,
}: {
  classTypes: ClassType[];
  initial: TimetableData;
}) {
  const timezone = initial.timezone;
  const [from, setFrom] = useState(() => todayLocalDate(timezone));

  // Which way the visitor last paged, so the incoming week enters from the
  // side it came from rather than always from the right.
  const [weekDir, setWeekDir] = useState<"forward" | "back">("forward");

  const goToWeek = (next: string) => {
    setWeekDir(next > from ? "forward" : "back");
    setFrom(next);
  };
  const [classType, setClassType] = useState("");

  const to = addLocalDays(from, DAYS_SHOWN - 1);

  const { data, isFetching } = useQuery({
    queryKey: ["schedule", from, to, classType],
    queryFn: () =>
      getSchedule({
        from,
        to,
        classType: classType || undefined,
      }),
    // The server already fetched this week, so the first render has data and
    // only a filter change or a page turn goes to the network.
    initialData:
      from === initial.from && !classType ? initial : undefined,
  });

  const days = groupByDay(data?.sessions ?? []);
  const today = todayLocalDate(timezone);
  const selectClass =
    "border border-border bg-surface-2 px-3 py-2.5 text-[13px] text-foreground focus:border-ring focus:outline-none";

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        <select
          className={selectClass}
          value={classType}
          onChange={(e) => setClassType(e.target.value)}
          aria-label="Filter by class"
        >
          <option value="">All classes</option>
          {classTypes.map((c) => (
            <option key={c._id} value={c._id}>
              {c.name}
            </option>
          ))}
        </select>

        <div className="ms-auto flex items-center gap-2">
          <button
            type="button"
            onClick={() => goToWeek(addLocalDays(from, -DAYS_SHOWN))}
            disabled={from <= today}
            className="border border-border px-3.5 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-foreground uppercase disabled:opacity-40"
          >
            ← Earlier
          </button>
          <button
            type="button"
            onClick={() => goToWeek(addLocalDays(from, DAYS_SHOWN))}
            className="border border-border px-3.5 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-foreground uppercase"
          >
            Later →
          </button>
        </div>
      </div>

      <p className="text-[12px] text-muted-foreground">
        {formatLocalDateShort(from)} – {formatLocalDateShort(to)}
        {isFetching && " · updating…"}
      </p>

      {days.length === 0 ? (
        <div className="border border-dashed border-border px-6 py-12 text-center">
          <p className="text-[13px] text-muted-foreground">
            Nothing scheduled in this range. Try another week or clear the filters.
          </p>
        </div>
      ) : (
        // Keyed on the week, so paging forward or back replays the entrance
        // instead of swapping a fortnight of sessions in a single frame.
        <div key={from} data-step-dir={weekDir} className="step-enter flex flex-col gap-8">
          {days.map((day) => (
            <section key={day.localDate} className="flex flex-col gap-3">
              <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
                {formatLocalDate(day.localDate)}
                {day.localDate === today && (
                  <span className="ms-3 bg-primary px-2 py-1 align-middle text-[10px] font-semibold tracking-[0.08em] text-primary-foreground">
                    Today
                  </span>
                )}
              </h2>

              <div className="border-t border-border">
                {day.sessions.map((session) => (
                  <SessionRow key={session._id} session={session} timezone={timezone} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

function SessionRow({ session, timezone }: { session: ClassSession; timezone: string }) {
  const queryClient = useQueryClient();
  const { data: user } = useCurrentUser();
  const state = availability(session);

  const book = useMutation({
    mutationFn: () => bookSession(session._id),
    onSuccess: () => {
      toast.success(`Booked — ${session.classType.name}`);
      queryClient.invalidateQueries({ queryKey: ["schedule"] });
      queryClient.invalidateQueries({ queryKey: ["bookings"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not book that class")),
  });

  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-3 border-b border-border py-4">
      <div className="w-24 shrink-0">
        <p className="font-display text-2xl leading-none text-foreground tabular-nums">
          {sessionTime(session, timezone)}
        </p>
        <p className="mt-1 text-[12px] text-muted-foreground tabular-nums">
          to {sessionEndTime(session, timezone)}
        </p>
      </div>

      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/classes/${session.classType.slug}`}
            className="text-[15px] font-semibold text-foreground hover:text-primary"
          >
            {session.classType.name}
          </Link>
          {session.womenOnly && (
            <span className="bg-surface-3 px-2 py-0.5 font-mono text-[10px] font-semibold tracking-[0.08em] text-foreground uppercase">
              Women only
            </span>
          )}
        </div>

        <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[12px] text-muted-foreground">
          {session.room && (
            <span className="flex items-center gap-1.5">
              <MapPin className="size-3.5" strokeWidth={1.5} />
              {session.room}
            </span>
          )}
          {session.trainer && (
            <span className="flex items-center gap-1.5">
              <User className="size-3.5" strokeWidth={1.5} />
              {session.trainer.name}
            </span>
          )}
          {session.classType.durationMinutes && (
            <span className="flex items-center gap-1.5">
              <Clock className="size-3.5" strokeWidth={1.5} />
              {session.classType.durationMinutes} min
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <Users className="size-3.5" strokeWidth={1.5} />
            {session.bookedCount}/{session.capacity}
          </span>
        </div>
      </div>

      <div className="flex shrink-0 items-center gap-3">
        <span
          className={`px-2.5 py-1 font-mono text-[10px] font-semibold tracking-[0.08em] uppercase ${TONE_STYLES[state.tone]}`}
        >
          {state.label}
        </span>

        {/* A signed-out visitor is sent to join rather than to sign in: they
            almost certainly do not have an account, and "log in" reads as a
            wall where "join" reads as the next step. */}
        {!user ? (
          <Link
            href="/join"
            className="border border-border px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.06em] text-foreground uppercase hover:border-foreground"
          >
            Join to book
          </Link>
        ) : state.tone === "full" ? (
          <span className="px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase">
            Full
          </span>
        ) : (
          <button
            type="button"
            disabled={book.isPending || book.isSuccess}
            onClick={() => book.mutate()}
            className="bg-primary px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.06em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
          >
            {book.isSuccess ? "Booked" : book.isPending ? "…" : "Book"}
          </button>
        )}
      </div>
    </div>
  );
}
