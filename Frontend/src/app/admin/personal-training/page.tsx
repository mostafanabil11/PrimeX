"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, Mail, MessageSquarePlus, CalendarDays } from "lucide-react";
import {
  getPtRequests,
  updatePtRequest,
  addPtRequestNote,
  PT_STATUSES,
  type PtRequest,
  type PtStatus,
} from "@/lib/api/personal-training";
import { apiErrorMessage } from "@/lib/api-error";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { whatsappHref } from "@/lib/gym-format";

const STATUS_LABELS: Record<PtStatus, string> = {
  new: "New",
  contacted: "Contacted",
  scheduled: "Scheduled",
  completed: "Completed",
  cancelled: "Cancelled",
};

// Status carries meaning, so it gets colour as well as a word — this list is
// scanned rather than read, and "new" has to jump out of thirty rows. Same
// palette as the enquiries inbox so staff are not learning two colour codes.
const STATUS_STYLES: Record<PtStatus, string> = {
  new: "bg-primary text-primary-foreground",
  contacted: "bg-surface-3 text-foreground",
  scheduled: "bg-surface-3 text-primary-soft",
  completed: "bg-surface-3 text-foreground",
  cancelled: "bg-surface-3 text-muted-foreground",
};

// The three that still need somebody to do something. Used for the count at the
// top, which is the only number on this page anyone acts on.
const OPEN_STATUSES: PtStatus[] = ["new", "contacted"];

export default function AdminPersonalTrainingPage() {
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<PtStatus | "">("");
  const [q, setQ] = useState("");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "pt", status, q],
    queryFn: () => getPtRequests({ status: status || undefined, q: q.trim() || undefined }),
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "pt"] });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: PtStatus }) =>
      updatePtRequest(id, { status: next }),
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update the status")),
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addPtRequestNote(id, body),
    onSuccess: () => {
      toast.success("Note added");
      setNoteFor(null);
      setNoteBody("");
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not add the note")),
  });

  const openCount = data
    ? OPEN_STATUSES.reduce((sum, s) => sum + (data.counts[s] ?? 0), 0)
    : 0;

  const controlClass =
    "border border-input bg-surface-2 px-3 py-2 text-base md:text-[12px] text-foreground focus:border-ring focus:outline-none";

  return (
    <div>
      <AdminPageHeader title="Personal Training" count={data?.total} />

      {openCount > 0 && (
        <p className="mb-6 border-l-2 border-primary bg-surface-1 px-4 py-3 text-[13px] text-foreground">
          <strong>{openCount}</strong> {openCount === 1 ? "request needs" : "requests need"} a reply.
        </p>
      )}

      {/* No price and no invoice on this screen, and it says so rather than
          leaving a gap where money would normally be. Staff opening this after
          the memberships screen would otherwise reasonably wonder what they are
          not seeing. */}
      <p className="mb-6 text-[13px] text-muted-foreground">
        Personal training is priced in the WhatsApp conversation — these requests
        raise no invoice. The member has already been created or matched on their
        phone number, so anything you agree can be recorded against them.
      </p>

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className={controlClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as PtStatus | "")}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {PT_STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]} {data ? `(${data.counts[s] ?? 0})` : ""}
            </option>
          ))}
        </select>
        <input
          className={`${controlClass} min-w-56`}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Name, phone or reference"
          aria-label="Search requests"
        />
      </div>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : data.requests.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.requests.map((r) => (
            <PtRow
              key={r._id}
              request={r}
              onStatus={(next) => setStatusMutation.mutate({ id: r._id, next })}
              isNoteOpen={noteFor === r._id}
              onToggleNote={() => {
                setNoteFor(noteFor === r._id ? null : r._id);
                setNoteBody("");
              }}
              noteBody={noteBody}
              onNoteBody={setNoteBody}
              onSaveNote={() => noteMutation.mutate({ id: r._id, body: noteBody })}
              isSavingNote={noteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function PtRow({
  request,
  onStatus,
  isNoteOpen,
  onToggleNote,
  noteBody,
  onNoteBody,
  onSaveNote,
  isSavingNote,
}: {
  request: PtRequest;
  onStatus: (next: PtStatus) => void;
  isNoteOpen: boolean;
  onToggleNote: () => void;
  noteBody: string;
  onNoteBody: (v: string) => void;
  onSaveNote: () => void;
  isSavingNote: boolean;
}) {
  const member = typeof request.member === "object" ? request.member : null;
  const starts = new Date(request.preferredStartsAt).toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="border border-border bg-surface-1 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-foreground">{request.memberName}</h2>
            <span
              className={`px-2 py-0.5 text-[11px] font-semibold tracking-[0.06em] uppercase ${STATUS_STYLES[request.status]}`}
            >
              {STATUS_LABELS[request.status]}
            </span>
            {request.referenceCode && (
              <span className="bg-surface-3 px-2 py-0.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-foreground">
                {request.referenceCode}
              </span>
            )}
            {member?.memberNumber && (
              <span className="text-[12px] text-muted-foreground">
                #{member.memberNumber}
              </span>
            )}
          </div>

          {/* The coach is the whole point of the record, so it reads first and
              in the accent — this list gets filtered by "who is asking for
              Marcus" more than by anything else. */}
          <p className="mt-2 text-[14px] text-foreground">
            Wants to train with{" "}
            <strong className="text-primary-soft">{request.trainerSnapshot.name}</strong>
          </p>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
            <a
              href={`tel:${request.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 text-foreground hover:text-primary-soft"
            >
              <Phone className="size-3.5" strokeWidth={1.5} />
              <span dir="ltr">{request.phone}</span>
            </a>
            <a
              href={whatsappHref(request.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-soft hover:underline"
            >
              WhatsApp
            </a>
            {member?.email && (
              <a
                href={`mailto:${member.email}`}
                className="flex items-center gap-1.5 break-all text-muted-foreground hover:text-foreground"
              >
                <Mail className="size-3.5" strokeWidth={1.5} />
                {member.email}
              </a>
            )}
          </div>

          <div className="mt-3 flex flex-col gap-1 text-[13px] text-muted-foreground">
            <p className="flex items-center gap-1.5">
              <CalendarDays className="size-3.5 shrink-0" strokeWidth={1.5} />
              <span>
                Wants to start <span className="text-foreground">{starts}</span>
              </span>
            </p>
            {request.preferredTimes && (
              <p>
                <span>Can train: </span>
                <span className="text-foreground">{request.preferredTimes}</span>
              </p>
            )}
            {request.goal && (
              <p>
                <span>Goal: </span>
                <span className="text-foreground">{request.goal}</span>
              </p>
            )}
          </div>

          <p className="mt-3 text-[12px] text-muted-foreground">
            {new Date(request.createdAt).toLocaleString()}
            {request.origin === "front_desk" && " · recorded at the desk"}
          </p>

          {request.notes.length > 0 && (
            <ul className="mt-3 flex flex-col gap-1.5 border-l border-border pl-3">
              {request.notes.map((n) => (
                <li key={n._id} className="text-[12px] text-muted-foreground">
                  <span className="text-foreground">{n.body}</span>
                  {" — "}
                  {new Date(n.createdAt).toLocaleDateString()}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <select
            value={request.status}
            onChange={(e) => onStatus(e.target.value as PtStatus)}
            aria-label={`Status for ${request.memberName}`}
            className="border border-input bg-surface-2 px-3 py-2 text-base md:text-[12px] text-foreground focus:border-ring focus:outline-none"
          >
            {PT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleNote}
            aria-label={`Add a note for ${request.memberName}`}
            className="ui-action ui-action--icon ui-action--ghost ui-action--sm flex size-11 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
          >
            <MessageSquarePlus className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {isNoteOpen && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-4">
          <textarea
            rows={2}
            value={noteBody}
            onChange={(e) => onNoteBody(e.target.value)}
            placeholder="What was agreed…"
            className="w-full resize-y border border-input bg-surface-2 px-3 py-2 text-base md:text-[13px] text-foreground focus:border-ring focus:outline-none"
          />
          <button
            type="button"
            disabled={!noteBody.trim() || isSavingNote}
            onClick={onSaveNote}
            className="ui-action ui-action--sm inline-flex w-fit bg-primary px-5 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase disabled:opacity-40"
          >
            {isSavingNote ? "Saving…" : "Save note"}
          </button>
        </div>
      )}
    </div>
  );
}
