"use client";

import { use } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle, Check, X } from "lucide-react";
import { getSession, getRoster, markAttendance, cancelSession } from "@/lib/api/schedule";
import { apiErrorMessage } from "@/lib/api-error";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { formatLocalDate, sessionTime, sessionEndTime } from "@/types/schedule";

export default function SessionRosterPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const queryClient = useQueryClient();

  const { data: session, isLoading: loadingSession } = useQuery({
    queryKey: ["admin", "session", id],
    queryFn: () => getSession(id),
  });

  const { data: roster, isLoading: loadingRoster } = useQuery({
    queryKey: ["admin", "roster", id],
    queryFn: () => getRoster(id),
  });

  const attendance = useMutation({
    mutationFn: ({ bookingId, attended }: { bookingId: string; attended: boolean }) =>
      markAttendance(bookingId, attended),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "roster", id] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update attendance")),
  });

  const cancel = useMutation({
    mutationFn: (reason: string) => cancelSession(id, reason),
    onSuccess: () => {
      toast.success("Class cancelled, members refunded and notified");
      queryClient.invalidateQueries({ queryKey: ["admin", "session", id] });
      queryClient.invalidateQueries({ queryKey: ["admin", "roster", id] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not cancel that class")),
  });

  if (loadingSession || !session) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  const booked = (roster ?? []).filter((r) => r.status !== "cancelled");

  return (
    <div>
      <AdminPageHeader
        title={session.classType.name}
      />

      <div className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-[13px] text-muted-foreground">
        <span>{formatLocalDate(session.localDate)}</span>
        <span className="tabular-nums">
          {sessionTime(session, "Africa/Cairo")}–{sessionEndTime(session, "Africa/Cairo")}
        </span>
        <span>{session.branch.name}{session.room ? ` · ${session.room}` : ""}</span>
        {session.trainer && <span>{session.trainer.name}</span>}
        <span className="tabular-nums">
          {session.bookedCount}/{session.capacity} booked
        </span>
        {session.status !== "scheduled" && (
          <span className="bg-surface-3 px-2 py-1 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
            {session.status}
          </span>
        )}
      </div>

      {session.status === "scheduled" && (
        <button
          type="button"
          onClick={() => {
            const reason = prompt("Reason for cancelling this class (shown to members):");
            if (reason !== null) cancel.mutate(reason);
          }}
          className="ui-action ui-action--sm inline-flex mb-6 border border-destructive px-4 py-2 text-[11px] font-semibold tracking-[0.06em] text-destructive uppercase"
        >
          Cancel this class
        </button>
      )}

      {loadingRoster || !roster ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : booked.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nobody has booked onto this class yet.</p>
      ) : (
        <div className="border-t border-border">
          {booked.map((entry) => (
            <div
              key={entry._id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-3.5"
            >
              <div>
                <p className="flex items-center gap-2 text-[14px] font-semibold text-foreground">
                  {entry.member.firstName} {entry.member.lastName}
                  {entry.member.parQ?.hasFlag && !entry.member.parQ?.clearedByStaffAt && (
                    <span title="Flagged on their health questionnaire — check in before they train">
                      <AlertTriangle className="size-3.5 text-primary" strokeWidth={2} />
                    </span>
                  )}
                </p>
                {entry.member.phone && (
                  <p className="text-[12px] text-muted-foreground">{entry.member.phone}</p>
                )}
              </div>

              <div className="flex items-center gap-2">
                {entry.status === "attended" || entry.status === "no_show" ? (
                  <span
                    className={`px-2.5 py-1 text-[10px] font-semibold tracking-[0.08em] uppercase ${
                      entry.status === "attended"
                        ? "bg-surface-3 text-primary"
                        : "bg-surface-3 text-destructive"
                    }`}
                  >
                    {entry.status === "attended" ? "Attended" : "No-show"}
                  </span>
                ) : (
                  <>
                    <button
                      type="button"
                      onClick={() => attendance.mutate({ bookingId: entry._id, attended: true })}
                      disabled={attendance.isPending}
                      aria-label="Mark attended"
                      className="ui-action ui-action--outline ui-action--sm flex items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-foreground uppercase hover:border-primary hover:text-primary-soft disabled:opacity-40"
                    >
                      <Check className="size-3.5" strokeWidth={2} />
                      Attended
                    </button>
                    <button
                      type="button"
                      onClick={() => attendance.mutate({ bookingId: entry._id, attended: false })}
                      disabled={attendance.isPending}
                      aria-label="Mark no-show"
                      className="ui-action ui-action--sm flex items-center gap-1.5 border border-border px-3 py-1.5 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:border-destructive hover:text-destructive disabled:opacity-40"
                    >
                      <X className="size-3.5" strokeWidth={2} />
                      No-show
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
