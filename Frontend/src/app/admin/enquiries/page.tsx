"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Phone, Mail, MessageSquarePlus } from "lucide-react";
import {
  getEnquiries,
  updateEnquiry,
  addEnquiryNote,
  type Enquiry,
  type EnquiryStatus,
  type EnquiryType,
} from "@/lib/api/gym";
import { apiErrorMessage } from "@/lib/api-error";
import { AdminPageHeader } from "@/components/admin/resource-list";
import { whatsappHref } from "@/lib/gym-format";

const STATUSES: EnquiryStatus[] = ["new", "contacted", "booked", "converted", "lost"];

const STATUS_LABELS: Record<EnquiryStatus, string> = {
  new: "New",
  contacted: "Contacted",
  booked: "Booked in",
  converted: "Joined",
  lost: "Lost",
};

// Status carries meaning, so it gets colour as well as a word — an inbox is
// scanned, not read, and "new" needs to jump out of a list of thirty.
const STATUS_STYLES: Record<EnquiryStatus, string> = {
  new: "bg-primary text-primary-foreground",
  contacted: "bg-surface-3 text-foreground",
  booked: "bg-surface-3 text-foreground",
  converted: "bg-surface-3 text-primary",
  lost: "bg-surface-3 text-muted-foreground",
};

export default function AdminEnquiriesPage() {
  const queryClient = useQueryClient();
  const [type, setType] = useState<EnquiryType | "">("");
  const [status, setStatus] = useState<EnquiryStatus | "">("");
  const [noteFor, setNoteFor] = useState<string | null>(null);
  const [noteBody, setNoteBody] = useState("");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "enquiries", type, status],
    queryFn: () => getEnquiries({ type: type || undefined, status: status || undefined }),
  });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["admin", "enquiries"] });

  const setStatusMutation = useMutation({
    mutationFn: ({ id, next }: { id: string; next: EnquiryStatus }) =>
      updateEnquiry(id, { status: next }),
    onSuccess: () => {
      toast.success("Status updated");
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not update the status")),
  });

  const noteMutation = useMutation({
    mutationFn: ({ id, body }: { id: string; body: string }) => addEnquiryNote(id, body),
    onSuccess: () => {
      toast.success("Note added");
      setNoteFor(null);
      setNoteBody("");
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not add the note")),
  });

  const selectClass =
    "border border-border bg-surface-2 px-3 py-2 text-[12px] text-foreground focus:border-ring focus:outline-none";

  return (
    <div>
      <AdminPageHeader title="Enquiries" count={data?.total} />

      {data && data.openCount > 0 && (
        <p className="mb-6 border-l-2 border-primary bg-surface-1 px-4 py-3 text-[13px] text-foreground">
          <strong>{data.openCount}</strong> {data.openCount === 1 ? "enquiry needs" : "enquiries need"}{" "}
          a call back.
        </p>
      )}

      <div className="mb-6 flex flex-wrap gap-3">
        <select
          className={selectClass}
          value={type}
          onChange={(e) => setType(e.target.value as EnquiryType | "")}
          aria-label="Filter by type"
        >
          <option value="">All types</option>
          <option value="trial">Free trial</option>
          <option value="contact">Contact</option>
        </select>
        <select
          className={selectClass}
          value={status}
          onChange={(e) => setStatus(e.target.value as EnquiryStatus | "")}
          aria-label="Filter by status"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      {isLoading || !data ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : data.enquiries.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">Nothing here yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {data.enquiries.map((e) => (
            <EnquiryRow
              key={e._id}
              enquiry={e}
              onStatus={(next) => setStatusMutation.mutate({ id: e._id, next })}
              isNoteOpen={noteFor === e._id}
              onToggleNote={() => {
                setNoteFor(noteFor === e._id ? null : e._id);
                setNoteBody("");
              }}
              noteBody={noteBody}
              onNoteBody={setNoteBody}
              onSaveNote={() => noteMutation.mutate({ id: e._id, body: noteBody })}
              isSavingNote={noteMutation.isPending}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function EnquiryRow({
  enquiry,
  onStatus,
  isNoteOpen,
  onToggleNote,
  noteBody,
  onNoteBody,
  onSaveNote,
  isSavingNote,
}: {
  enquiry: Enquiry;
  onStatus: (next: EnquiryStatus) => void;
  isNoteOpen: boolean;
  onToggleNote: () => void;
  noteBody: string;
  onNoteBody: (v: string) => void;
  onSaveNote: () => void;
  isSavingNote: boolean;
}) {
  const branchName = typeof enquiry.branch === "object" ? enquiry.branch?.name : null;
  const trainerName = typeof enquiry.trainer === "object" ? enquiry.trainer?.name : null;

  return (
    <div className="border border-border bg-surface-1 p-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-[15px] font-semibold text-foreground">{enquiry.name}</h2>
            <span
              className={`px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] uppercase ${STATUS_STYLES[enquiry.status]}`}
            >
              {STATUS_LABELS[enquiry.status]}
            </span>
            <span className="bg-surface-3 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
              {enquiry.type === "trial" ? "Free trial" : "Contact"}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[13px]">
            <a
              href={`tel:${enquiry.phone.replace(/\s/g, "")}`}
              className="flex items-center gap-1.5 text-foreground hover:text-primary-soft"
            >
              <Phone className="size-3.5" strokeWidth={1.5} />
              {enquiry.phone}
            </a>
            <a
              href={whatsappHref(enquiry.phone)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline"
            >
              WhatsApp
            </a>
            {enquiry.email && (
              <a
                href={`mailto:${enquiry.email}`}
                className="flex items-center gap-1.5 break-all text-muted-foreground hover:text-foreground"
              >
                <Mail className="size-3.5" strokeWidth={1.5} />
                {enquiry.email}
              </a>
            )}
          </div>

          {(enquiry.goal || enquiry.message || enquiry.preferredTime) && (
            <div className="mt-3 flex flex-col gap-1 text-[13px] text-muted-foreground">
              {enquiry.goal && (
                <p>
                  <span className="text-muted-foreground">Goal: </span>
                  <span className="text-foreground">{enquiry.goal}</span>
                </p>
              )}
              {enquiry.preferredTime && (
                <p>
                  <span className="text-muted-foreground">Prefers: </span>
                  <span className="text-foreground">{enquiry.preferredTime}</span>
                </p>
              )}
              {enquiry.message && <p className="text-foreground">{enquiry.message}</p>}
            </div>
          )}

          <p className="mt-3 text-[12px] text-muted-foreground">
            {new Date(enquiry.createdAt).toLocaleString()}
            {branchName && ` · ${branchName}`}
            {trainerName && ` · asked for ${trainerName}`}
            {enquiry.source && ` · from ${enquiry.source}`}
          </p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <select
            value={enquiry.status}
            onChange={(e) => onStatus(e.target.value as EnquiryStatus)}
            aria-label={`Status for ${enquiry.name}`}
            className="border border-input bg-surface-2 px-3 py-2 text-base md:text-[12px] text-foreground focus:border-ring focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s} value={s}>
                {STATUS_LABELS[s]}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={onToggleNote}
            aria-label={`Add a note to ${enquiry.name}`}
            className="ui-action ui-action--icon ui-action--ghost ui-action--sm inline-flex -m-1 p-1 text-muted-foreground hover:text-foreground"
          >
            <MessageSquarePlus className="size-4" strokeWidth={1.5} />
          </button>
        </div>
      </div>

      {enquiry.notes.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
          {enquiry.notes.map((note) => (
            <li key={note._id} className="text-[13px] text-muted-foreground">
              <span className="text-foreground">{note.body}</span>
              <span className="ml-2 text-[11px]">
                {new Date(note.createdAt).toLocaleDateString()}
              </span>
            </li>
          ))}
        </ul>
      )}

      {isNoteOpen && (
        <div className="mt-4 flex flex-col gap-2 border-t border-border pt-3">
          <textarea
            rows={2}
            value={noteBody}
            onChange={(e) => onNoteBody(e.target.value)}
            placeholder="Called, no answer. Trying again tomorrow."
            aria-label="Note"
            className="w-full resize-y border border-input bg-surface-2 px-3 py-2 text-base md:text-[13px] text-foreground focus:border-ring focus:outline-none"
          />
          <button
            type="button"
            disabled={!noteBody.trim() || isSavingNote}
            onClick={onSaveNote}
            className="ui-action ui-action--sm inline-flex w-fit bg-primary px-4 py-2 text-[12px] font-semibold tracking-[0.06em] text-primary-foreground uppercase disabled:opacity-40"
          >
            {isSavingNote ? "Saving…" : "Add note"}
          </button>
        </div>
      )}
    </div>
  );
}
