"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Copy, KeyRound } from "lucide-react";
import {
  getStaff,
  createStaff,
  resetStaffPassword,
  setStaffActive,
  type StaffAccount,
} from "@/lib/api/admin";
import { formatMembershipDate } from "@/lib/gym-format";
import { AdminPageHeader } from "@/components/admin/resource-list";
import {
  FormSection,
  TextInput,
  FormActions,
  apiErrorMessage,
} from "@/components/admin/form-fields";

/**
 * Front-desk accounts.
 *
 * Admin-only, and it can only ever make staff — an admin is created in a shell
 * with scripts/set-admin-password.js, so a stolen admin session cannot mint a
 * second owner or lock the real one out.
 *
 * The switch is the important control here, more than the add button: when
 * somebody leaves, their access has to stop that minute. Turning an account
 * off clears its sessions, so the next token rotation fails rather than
 * quietly renewing for another fortnight.
 */
export default function AdminStaffPage() {
  const queryClient = useQueryClient();
  const { data: staff, isLoading } = useQuery({ queryKey: ["admin", "staff"], queryFn: getStaff });

  const [adding, setAdding] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");

  // Shown once, right after it is issued. Kept in state rather than refetched
  // because the server does not keep it — only the hash.
  const [issued, setIssued] = useState<{ name: string; password: string } | null>(null);

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["admin", "staff"] });

  const create = useMutation({
    mutationFn: () => createStaff({ firstName, lastName, email }),
    onSuccess: (data) => {
      setIssued({ name: `${data.firstName} ${data.lastName}`, password: data.password });
      setAdding(false);
      setFirstName("");
      setLastName("");
      setEmail("");
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not create that account")),
  });

  const reset = useMutation({
    mutationFn: (member: StaffAccount) => resetStaffPassword(member._id),
    onSuccess: (data, member) => {
      setIssued({ name: `${member.firstName} ${member.lastName}`, password: data.password });
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not reset that password")),
  });

  const toggle = useMutation({
    mutationFn: ({ id, isActive }: { id: string; isActive: boolean }) =>
      setStaffActive(id, isActive),
    onSuccess: (_d, vars) => {
      toast.success(vars.isActive ? "Access restored" : "Access revoked — they are signed out now");
      invalidate();
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not change that account")),
  });

  return (
    <div>
      <AdminPageHeader title="Staff" count={staff?.length} />

      <p className="mb-6 max-w-2xl text-[13px] text-muted-foreground">
        Front-desk accounts. They can run the gym — take payments, record memberships, apply
        offers — but only you can add or remove them. The email is just a login; it never has to
        receive anything, so something like{" "}
        <span className="text-foreground">sara@yourgym.eg</span> is fine.
      </p>

      {issued && <IssuedPassword issued={issued} onDismiss={() => setIssued(null)} />}

      {adding ? (
        <form
          className="mb-8 max-w-xl"
          onSubmit={(e) => {
            e.preventDefault();
            create.mutate();
          }}
        >
          <FormSection title="New staff account">
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput label="First name" required value={firstName} onChange={setFirstName} />
              <TextInput label="Last name" required value={lastName} onChange={setLastName} />
            </div>
            <TextInput
              label="Login email"
              type="email"
              required
              value={email}
              onChange={setEmail}
              hint="Used to sign in. Does not need to be a real mailbox."
            />
          </FormSection>
          <FormActions
            isSaving={create.isPending}
            saveLabel="Create account"
            onCancel={() => setAdding(false)}
          />
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="mb-8 bg-primary px-5 py-3 text-[12px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
        >
          Add staff member
        </button>
      )}

      {isLoading ? (
        <div className="h-40 animate-pulse bg-muted" />
      ) : !staff || staff.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          No staff accounts yet. Add one above and hand them the password.
        </p>
      ) : (
        <div className="border-t border-border">
          {staff.map((member) => (
            <div
              key={member._id}
              className="flex flex-wrap items-center justify-between gap-3 border-b border-border py-4"
            >
              <div className="min-w-0">
                <p className="text-[14px] font-semibold text-foreground">
                  {member.firstName} {member.lastName}
                  {!member.isActive && (
                    <span className="ml-2 bg-surface-3 px-2 py-0.5 text-[10px] font-semibold tracking-[0.08em] text-muted-foreground uppercase">
                      Switched off
                    </span>
                  )}
                </p>
                <p className="text-[12px] break-all text-muted-foreground">
                  {member.email} · added {formatMembershipDate(member.createdAt)}
                </p>
              </div>

              <div className="flex shrink-0 items-center gap-2">
                <button
                  type="button"
                  disabled={reset.isPending}
                  onClick={() => {
                    if (confirm(`Issue a new password for ${member.firstName}? This signs them out everywhere.`)) {
                      reset.mutate(member);
                    }
                  }}
                  className="flex items-center gap-1.5 border border-border px-3 py-2 text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground disabled:opacity-40"
                >
                  <KeyRound className="size-3.5" strokeWidth={1.5} />
                  Reset password
                </button>

                <button
                  type="button"
                  disabled={toggle.isPending}
                  onClick={() => {
                    const next = !member.isActive;
                    if (
                      next ||
                      confirm(
                        `Switch off ${member.firstName} ${member.lastName}? They are signed out immediately and cannot sign back in.`
                      )
                    ) {
                      toggle.mutate({ id: member._id, isActive: next });
                    }
                  }}
                  className={`px-3 py-2 text-[11px] font-semibold tracking-[0.06em] uppercase disabled:opacity-40 ${
                    member.isActive
                      ? "border border-destructive text-destructive hover:bg-destructive hover:text-background"
                      : "bg-primary text-primary-foreground transition-colors hover:bg-primary-hover"
                  }`}
                >
                  {member.isActive ? "Switch off" : "Switch on"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

/**
 * The one moment the password is visible.
 *
 * Deliberately loud and deliberately dismissable only by hand — it cannot be
 * recovered afterwards, so an admin closing the page without reading it means
 * another reset.
 */
function IssuedPassword({
  issued,
  onDismiss,
}: {
  issued: { name: string; password: string };
  onDismiss: () => void;
}) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="mb-8 border border-primary bg-surface-1 p-6">
      <p className="text-[11px] font-semibold tracking-[0.12em] text-primary-soft uppercase">
        Password for {issued.name}
      </p>
      <p className="mt-1 mb-4 text-[13px] text-muted-foreground">
        Write this down or hand it over now — it is not stored and cannot be shown again.
      </p>

      <button
        type="button"
        onClick={() => {
          void navigator.clipboard?.writeText(issued.password);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 2000);
        }}
        className="flex items-center gap-3 border border-border bg-background px-5 py-3 text-xl tracking-[0.1em] text-foreground hover:border-foreground"
      >
        {issued.password}
        {copied ? (
          <Check className="size-4 text-primary" strokeWidth={2} />
        ) : (
          <Copy className="size-4 text-muted-foreground" strokeWidth={1.5} />
        )}
      </button>

      <button
        type="button"
        onClick={onDismiss}
        className="mt-4 block text-[12px] font-semibold tracking-[0.06em] text-muted-foreground uppercase hover:text-foreground"
      >
        I have saved it
      </button>
    </div>
  );
}
