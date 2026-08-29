"use client";

import { useState } from "react";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { AlertTriangle } from "lucide-react";
import { getMemberProfile, updateProfile, type MemberProfile } from "@/lib/api/auth";
import { changePassword } from "@/lib/api/auth";
import { apiErrorMessage } from "@/lib/api-error";

const inputBase =
  "w-full border border-border bg-surface-2 px-3.5 py-3 text-[14px] text-foreground placeholder:text-muted-foreground focus:border-ring focus:outline-none focus:ring-1 focus:ring-ring";
const labelBase = "font-mono text-[11px] font-semibold tracking-[0.12em] text-muted-foreground uppercase";

export default function AccountSettingsPage() {
  const { data: profile, isLoading } = useQuery({
    queryKey: ["auth", "me"],
    queryFn: getMemberProfile,
  });

  if (isLoading || !profile) {
    return <div className="h-96 animate-pulse bg-muted" />;
  }

  // Keyed on the loaded profile so the form initialises from it once, rather
  // than syncing through an effect — an effect that calls setState on load is
  // a cascading render, and this needs none.
  return <SettingsForm key={profile.email} profile={profile} />;
}

function SettingsForm({ profile }: { profile: MemberProfile }) {
  const queryClient = useQueryClient();

  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [dateOfBirth, setDateOfBirth] = useState(profile.dateOfBirth?.slice(0, 10) ?? "");
  const [emergencyName, setEmergencyName] = useState(profile.emergencyContact?.name ?? "");
  const [emergencyPhone, setEmergencyPhone] = useState(profile.emergencyContact?.phone ?? "");
  const [emergencyRelationship, setEmergencyRelationship] = useState(
    profile.emergencyContact?.relationship ?? "",
  );
  const [medicalNotes, setMedicalNotes] = useState(profile.medicalNotes ?? "");
  const [emailClassReminders, setEmailClassReminders] = useState(profile.emailClassReminders);
  const [emailMarketing, setEmailMarketing] = useState(profile.emailMarketing);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  const saveProfile = useMutation({
    mutationFn: () =>
      updateProfile({
        firstName,
        lastName,
        phone: phone || null,
        dateOfBirth: dateOfBirth || null,
        emergencyContactName: emergencyName || null,
        emergencyContactPhone: emergencyPhone || null,
        emergencyContactRelationship: emergencyRelationship || null,
        medicalNotes: medicalNotes || null,
        emailClassReminders,
        emailMarketing,
      }),
    onSuccess: () => {
      toast.success("Saved");
      queryClient.invalidateQueries({ queryKey: ["auth", "me"] });
      queryClient.invalidateQueries({ queryKey: ["auth", "profile"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save your details")),
  });

  const savePassword = useMutation({
    mutationFn: () => changePassword({ currentPassword, newPassword }),
    onSuccess: () => {
      // Changing a password invalidates every session, this one included —
      // so the member is sent back to sign in rather than left on a page
      // whose next request will 401.
      toast.success("Password changed. Please sign in again.");
      queryClient.setQueryData(["auth", "profile"], null);
      // Absolute, not "/login": a relative destination reads to the lint
      // rule as something that should go through the router instead, but a
      // full reload is the actual intent here — every session was just
      // invalidated, and router.push() would leave stale client state
      // (React Query cache, in-memory auth) behind instead of clearing it.
      window.location.assign(new URL("/login", window.location.origin).toString());
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not change your password")),
  });

  return (
    <div className="flex max-w-2xl flex-col gap-stack-sm">
      <h1 className="font-display text-4xl tracking-[-0.02em] text-foreground uppercase md:text-5xl">
        Profile &amp; settings
      </h1>

      {profile.parQFlagged && (
        <div className="flex items-start gap-3 border-l-2 border-primary bg-surface-1 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-primary" strokeWidth={1.5} />
          <p className="text-[13px] text-foreground">
            One of your health answers means a coach will have a quick word with you before your
            first session. Nothing to worry about — just come a few minutes early.
          </p>
        </div>
      )}

      <form
        className="flex flex-col gap-6"
        onSubmit={(e) => {
          e.preventDefault();
          saveProfile.mutate();
        }}
      >
        <Section title="About you">
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="first" label="First name" required>
              <input id="first" required className={inputBase} value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </Field>
            <Field id="last" label="Last name" required>
              <input id="last" required className={inputBase} value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </Field>
          </div>
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="phone" label="Phone">
              <input id="phone" type="tel" className={inputBase} value={phone} onChange={(e) => setPhone(e.target.value)} />
            </Field>
            <Field id="dob" label="Date of birth">
              <input id="dob" type="date" className={inputBase} value={dateOfBirth} onChange={(e) => setDateOfBirth(e.target.value)} />
            </Field>
          </div>
          <p className="text-[12px] text-muted-foreground">
            Your email is {profile.email}. To change it, talk to the front desk.
          </p>
        </Section>

        <Section
          title="Emergency contact"
          description="Who we call if something happens while you are training."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <Field id="ename" label="Name">
              <input id="ename" className={inputBase} value={emergencyName} onChange={(e) => setEmergencyName(e.target.value)} />
            </Field>
            <Field id="ephone" label="Phone">
              <input id="ephone" type="tel" className={inputBase} value={emergencyPhone} onChange={(e) => setEmergencyPhone(e.target.value)} />
            </Field>
          </div>
          <Field id="erel" label="Relationship to you">
            <input id="erel" className={inputBase} value={emergencyRelationship} onChange={(e) => setEmergencyRelationship(e.target.value)} />
          </Field>
        </Section>

        <Section
          title="Health"
          description="Only you and the staff keeping you safe can see this."
        >
          <Field id="medical" label="Injuries, conditions, medication">
            <textarea
              id="medical"
              rows={4}
              maxLength={2000}
              className={`${inputBase} resize-y leading-relaxed`}
              value={medicalNotes}
              onChange={(e) => setMedicalNotes(e.target.value)}
            />
          </Field>
          <p className="text-[12px] text-muted-foreground">
            You can clear this at any time. See our{" "}
            <Link href="/privacy" className="text-primary underline">
              privacy policy
            </Link>{" "}
            for how it is handled.
          </p>
        </Section>

        <Section
          title="Notifications"
          description="Receipts, expiry warnings and anything affecting a class you booked always send — those are part of the service."
        >
          <Toggle
            label="Class reminders"
            hint="The evening before a session you have booked."
            checked={emailClassReminders}
            onChange={setEmailClassReminders}
          />
          <Toggle
            label="News and offers"
            hint="Occasional. Never more than monthly."
            checked={emailMarketing}
            onChange={setEmailMarketing}
          />
        </Section>

        <button
          type="submit"
          disabled={saveProfile.isPending}
          className="w-fit bg-primary px-7 py-3.5 font-mono text-[13px] font-semibold tracking-[0.08em] text-primary-foreground uppercase transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {saveProfile.isPending ? "Saving…" : "Save changes"}
        </button>
      </form>

      <form
        className="flex flex-col gap-6 border-t border-border pt-stack-sm"
        onSubmit={(e) => {
          e.preventDefault();
          savePassword.mutate();
        }}
      >
        <Section
          title="Password"
          description="Changing it signs you out everywhere, including here."
        >
          <Field id="cur" label="Current password" required>
            <input id="cur" type="password" required autoComplete="current-password" className={inputBase} value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} />
          </Field>
          <Field id="new" label="New password" required>
            <input id="new" type="password" required autoComplete="new-password" minLength={8} className={inputBase} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} />
          </Field>
        </Section>

        <button
          type="submit"
          disabled={savePassword.isPending || !currentPassword || !newPassword}
          className="w-fit border border-border px-7 py-3.5 font-mono text-[13px] font-semibold tracking-[0.08em] text-foreground uppercase disabled:opacity-40"
        >
          {savePassword.isPending ? "Changing…" : "Change password"}
        </button>
      </form>

      {profile.referralCode && (
        <section className="flex flex-col gap-2 border-t border-border pt-stack-sm">
          <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
            Your referral code
          </h2>
          {/* Mono, not the display face. This is a string someone reads aloud
              or types in — the monospace makes 0/O and 1/l distinguishable,
              which a heavy italic grotesque actively does not. Open tracking
              for the same reason. */}
          <p className="font-mono text-3xl font-bold tracking-[0.08em] text-primary-soft">
            {profile.referralCode}
          </p>
          <p className="text-[13px] text-muted-foreground">
            Give it to a friend. Ask at the desk what it is worth this month.
          </p>
        </section>
      )}
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="font-display text-xl tracking-[-0.02em] text-foreground uppercase">
          {title}
        </h2>
        {description && <p className="mt-1 text-[12px] text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

function Field({
  id,
  label,
  required,
  children,
}: {
  id: string;
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={id} className={labelBase}>
        {label}
        {required && <span className="ml-1 text-destructive">*</span>}
      </label>
      {children}
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-0.5 size-4 shrink-0 accent-primary"
      />
      <span>
        <span className="block text-[13px] font-medium text-foreground">{label}</span>
        <span className="block text-[12px] text-muted-foreground">{hint}</span>
      </span>
    </label>
  );
}
