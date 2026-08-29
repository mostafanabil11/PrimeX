"use client";

import { useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { UserCheck, UserPlus, AlertTriangle } from "lucide-react";
import { getPlans } from "@/lib/api/gym";
import {
  previewJoin,
  lookupMemberByPhone,
  recordMembership,
  type MemberLookupResult,
} from "@/lib/api/membership";
import { formatPrice } from "@/lib/format";
import { formatDuration, formatMembershipDate } from "@/lib/gym-format";
import {
  FormSection,
  TextInput,
  Select,
  Toggle,
  TextArea,
  FormActions,
  apiErrorMessage,
} from "@/components/admin/form-fields";

/**
 * Signing someone up at the front desk.
 *
 * The counterpart to the public reservation form, for the walk-in who never
 * touched the website. It creates the same pending subscription and invoice,
 * and — because the cash is usually already in hand — can settle it in the
 * same action.
 *
 * Two things it deliberately does not have:
 *
 *  - A price field. Plans are priced on the website and the server quotes
 *    them; letting the desk type a number is how a membership gets sold below
 *    cost without anyone deciding to. The total below is read-only.
 *  - A member picker. Phone is the identity — type it, and the form tells you
 *    whether this is somebody new or somebody we already have.
 */

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

export function RecordMembershipForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [phone, setPhone] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [planId, setPlanId] = useState("");
  const [startsAt, setStartsAt] = useState(todayIso);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "instapay">("cash");
  const [markPaid, setMarkPaid] = useState(true);
  const [note, setNote] = useState("");

  const { data: plans } = useQuery({ queryKey: ["admin", "plans", "active"], queryFn: getPlans });

  useEffect(() => {
    if (!planId && plans?.length) setPlanId(plans[0]._id);
  }, [plans, planId]);

  // Debounced so it does not fire on every keystroke of an eleven-digit
  // number. Only asks once the phone is long enough to be real.
  const [debouncedPhone, setDebouncedPhone] = useState("");
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedPhone(phone.trim()), 400);
    return () => window.clearTimeout(t);
  }, [phone]);

  const { data: lookup } = useQuery({
    queryKey: ["admin", "member-lookup", debouncedPhone],
    queryFn: () => lookupMemberByPhone(debouncedPhone),
    enabled: debouncedPhone.replace(/\D/g, "").length >= 8,
    retry: false,
  });

  // Prefill from the found member, but only for fields the person at the desk
  // has not already typed into — retyping over someone's input mid-entry is
  // maddening, and the lookup lands a beat after they start.
  useEffect(() => {
    if (!lookup?.found) return;
    setFirstName((v) => v || lookup.firstName || "");
    setLastName((v) => v || lookup.lastName || "");
    setEmail((v) => v || lookup.email || "");
  }, [lookup]);

  const { data: quote } = useQuery({
    queryKey: ["join", "preview", planId],
    queryFn: () => previewJoin(planId),
    enabled: Boolean(planId),
  });

  const planOptions = useMemo(
    () => (plans ?? []).map((p) => ({ value: p._id, label: `${p.name} — ${formatDuration(p)}` })),
    [plans]
  );

  const blockedByActive = Boolean(lookup?.found && lookup.hasActiveMembership);
  const backdated = startsAt < todayIso();

  const save = useMutation({
    mutationFn: () =>
      recordMembership({
        planId,
        startsAt,
        firstName,
        lastName,
        phone,
        email: email.trim() || null,
        paymentMethod,
        markPaid,
        note: note.trim() || null,
      }),
    onSuccess: (data) => {
      toast.success(
        data.paid
          ? `Membership active — ref ${data.referenceCode}`
          : `Recorded, awaiting payment — ref ${data.referenceCode}`
      );
      queryClient.invalidateQueries({ queryKey: ["admin", "invoices"] });
      queryClient.invalidateQueries({ queryKey: ["admin", "gym-dashboard"] });
      router.push("/admin/memberships");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not record the membership")),
  });

  return (
    <form
      className="flex max-w-2xl flex-col gap-6 pb-4"
      onSubmit={(e) => {
        e.preventDefault();
        save.mutate();
      }}
    >
      <FormSection
        title="Who"
        description="Start with the phone number — it is how we find them again when they message."
      >
        <TextInput
          label="Phone"
          required
          value={phone}
          onChange={setPhone}
          placeholder="010 0000 0000"
        />

        {lookup && <LookupBanner lookup={lookup} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="First name" required value={firstName} onChange={setFirstName} />
          <TextInput label="Last name" required value={lastName} onChange={setLastName} />
        </div>

        <TextInput
          label="Email"
          type="email"
          value={email}
          onChange={setEmail}
          hint="Optional. Leave blank and no receipt is emailed — the membership works either way."
        />
      </FormSection>

      <FormSection title="Membership">
        <Select
          label="Plan"
          required
          value={planId}
          onChange={setPlanId}
          options={planOptions}
        />

        <TextInput
          label="Start date"
          type="date"
          required
          value={startsAt}
          onChange={setStartsAt}
          hint={
            backdated
              ? "Backdated — the term will run from this date, not from today."
              : "Today, or a date they are starting on."
          }
        />

        {quote && (
          <div className="border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between text-[13px] text-muted-foreground">
              <span>Plan</span>
              <span className="tabular-nums">{formatPrice(quote.planPriceMinorUnits)}</span>
            </div>
            {quote.joiningFeeMinorUnits > 0 && (
              <div className="mt-1 flex items-center justify-between text-[13px] text-muted-foreground">
                <span>Joining fee</span>
                <span className="tabular-nums">{formatPrice(quote.joiningFeeMinorUnits)}</span>
              </div>
            )}
            {quote.taxMinorUnits > 0 && (
              <div className="mt-1 flex items-center justify-between text-[13px] text-muted-foreground">
                <span>Tax</span>
                <span className="tabular-nums">{formatPrice(quote.taxMinorUnits)}</span>
              </div>
            )}
            <div className="mt-3 flex items-center justify-between border-t border-border pt-3 text-[15px] font-semibold text-foreground">
              <span>Total</span>
              <span className="tabular-nums">{formatPrice(quote.totalMinorUnits)}</span>
            </div>
            {/* Read-only on purpose — see the note at the top of this file. */}
            <p className="mt-2 text-[12px] text-muted-foreground">
              Priced from the plan. To change it, change the plan or run an offer.
            </p>
          </div>
        )}
      </FormSection>

      <FormSection title="Payment">
        <Select
          label="Method"
          required
          value={paymentMethod}
          onChange={(v) => setPaymentMethod(v as "cash" | "instapay")}
          options={[
            { value: "cash", label: "Cash" },
            { value: "instapay", label: "InstaPay" },
          ]}
        />
        <Toggle
          label="Payment taken now"
          checked={markPaid}
          onChange={setMarkPaid}
          hint={
            markPaid
              ? "The membership activates immediately and the money counts towards this month."
              : "Recorded as awaiting payment. It shows on the dashboard until someone settles it."
          }
        />
        <TextArea
          label="Note"
          value={note}
          onChange={setNote}
          rows={2}
          maxLength={500}
          hint="Optional, for anything unusual about this signup."
        />
      </FormSection>

      {blockedByActive && (
        <p className="border border-destructive px-4 py-3 text-[13px] text-destructive">
          {lookup?.firstName} already has an active membership
          {lookup?.activeUntil ? ` until ${formatMembershipDate(lookup.activeUntil)}` : ""}. Cancel
          or wait for it to expire before recording a new one.
        </p>
      )}

      <FormActions
        isSaving={save.isPending}
        saveLabel={markPaid ? "Record and activate" : "Record as unpaid"}
        onCancel={() => router.push("/admin/memberships")}
      />
    </form>
  );
}

/** Tells the desk, before they commit, whether this is a new face or not. */
function LookupBanner({ lookup }: { lookup: MemberLookupResult }) {
  if (!lookup.found) {
    return (
      <p className="flex items-start gap-2.5 border border-border bg-surface-1 px-4 py-3 text-[13px] text-muted-foreground">
        <UserPlus className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.5} />
        New member — an account will be created for them.
      </p>
    );
  }

  const Icon = lookup.hasActiveMembership ? AlertTriangle : UserCheck;

  return (
    <p
      className={`flex items-start gap-2.5 border px-4 py-3 text-[13px] ${
        lookup.hasActiveMembership
          ? "border-destructive text-destructive"
          : "border-border bg-surface-1 text-muted-foreground"
      }`}
    >
      <Icon className="mt-0.5 size-4 shrink-0" strokeWidth={1.5} />
      <span>
        <span className="font-semibold text-foreground">
          {lookup.firstName} {lookup.lastName}
        </span>
        {lookup.memberNumber ? ` · member ${lookup.memberNumber}` : ""}
        {lookup.hasActiveMembership && lookup.activeUntil
          ? ` — already active until ${formatMembershipDate(lookup.activeUntil)}`
          : " — existing member, no active membership"}
      </span>
    </p>
  );
}
