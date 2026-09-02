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
  // null means "use the matching member's saved value"; an empty string is a
  // deliberate edit. Keeping those states distinct lets lookup data prefill
  // the form without an effect that writes state after every result.
  const [firstName, setFirstName] = useState<string | null>(null);
  const [lastName, setLastName] = useState<string | null>(null);
  const [email, setEmail] = useState<string | null>(null);
  const [planId, setPlanId] = useState("");
  const [startsAt, setStartsAt] = useState(todayIso);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "instapay">("cash");
  const [markPaid, setMarkPaid] = useState(true);
  const [note, setNote] = useState("");

  const { data: plans } = useQuery({ queryKey: ["admin", "plans", "active"], queryFn: getPlans });

  const effectivePlanId = planId || plans?.[0]?._id || "";

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

  // Do not show the previous phone's result during the debounce window.
  const currentLookup = phone.trim() === debouncedPhone ? lookup : undefined;
  const effectiveFirstName = firstName ?? (currentLookup?.found ? currentLookup.firstName : "") ?? "";
  const effectiveLastName = lastName ?? (currentLookup?.found ? currentLookup.lastName : "") ?? "";
  const effectiveEmail = email ?? (currentLookup?.found ? currentLookup.email : "") ?? "";

  const { data: quote } = useQuery({
    queryKey: ["join", "preview", effectivePlanId],
    queryFn: () => previewJoin(effectivePlanId),
    enabled: Boolean(effectivePlanId),
  });

  const planOptions = useMemo(
    () => (plans ?? []).map((p) => ({ value: p._id, label: `${p.name} — ${formatDuration(p)}` })),
    [plans]
  );

  const blockedByActive = Boolean(currentLookup?.found && currentLookup.hasActiveMembership);
  const backdated = startsAt < todayIso();

  const save = useMutation({
    mutationFn: () =>
      recordMembership({
        planId: effectivePlanId,
        startsAt,
        firstName: effectiveFirstName,
        lastName: effectiveLastName,
        phone,
        email: effectiveEmail.trim() || null,
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
          onChange={(value) => {
            setPhone(value);
            setFirstName(null);
            setLastName(null);
            setEmail(null);
          }}
          placeholder="010 0000 0000"
        />

        {currentLookup && <LookupBanner lookup={currentLookup} />}

        <div className="grid gap-4 sm:grid-cols-2">
          <TextInput label="First name" required value={effectiveFirstName} onChange={setFirstName} />
          <TextInput label="Last name" required value={effectiveLastName} onChange={setLastName} />
        </div>

        <TextInput
          label="Email"
          type="email"
          value={effectiveEmail}
          onChange={setEmail}
          hint="Optional. Leave blank and no receipt is emailed — the membership works either way."
        />
      </FormSection>

      <FormSection title="Membership">
        <Select
          label="Plan"
          required
          value={effectivePlanId}
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
          {currentLookup?.firstName} already has an active membership
          {currentLookup?.activeUntil ? ` until ${formatMembershipDate(currentLookup.activeUntil)}` : ""}. Cancel
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
