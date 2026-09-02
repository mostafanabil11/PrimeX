"use client";

import { useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import { useMutation } from "@tanstack/react-query";
import { Check } from "lucide-react";
import { submitEnquiry } from "@/lib/api/gym";
import { apiErrorMessage } from "@/lib/api-error";
import { ctaClasses } from "@/components/public/section";
import { fieldInput, fieldLabel } from "@/components/ui/form-classes";

// Shared with every other form on the site — see ui/form-classes.ts.
const inputBase = fieldInput;

const labelBase = fieldLabel;

export function EnquiryForm({
  type,
  submitLabel,
  goalPlaceholder,
}: {
  type: "contact" | "trial";
  submitLabel: string;
  goalPlaceholder?: string;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [goal, setGoal] = useState("");
  const [message, setMessage] = useState("");
  const [preferredTime, setPreferredTime] = useState("");
  // Honeypot: hidden from people, irresistible to naive form bots. Never
  // shown, never focusable, and excluded from the tab order.
  const [website, setWebsite] = useState("");

  const mutation = useMutation({
    mutationFn: () =>
      submitEnquiry({
        type,
        name,
        phone,
        email: email || null,
        goal: goal || null,
        message: message || null,
        preferredTime: preferredTime || null,
        // One site, so nobody expresses a branch preference any more. The
        // field stays on the enquiry rather than being dropped: it is what a
        // second location would start filling in again.
        branch: null,
        // Carried through from the trainer page CTA, so staff know who the
        // enquiry was about rather than starting the call cold.
        trainerSlug: searchParams.get("trainer"),
        source: pathname,
        website,
      }),
  });

  if (mutation.isSuccess) {
    return (
      <div className="flex flex-col items-start gap-3 border border-primary bg-surface-1 p-8">
        <Check className="size-8 text-primary" strokeWidth={1.5} />
        <h2 className="font-display text-2xl tracking-[-0.02em] text-foreground uppercase">
          Got it
        </h2>
        <p className="max-w-md text-body-md text-muted-foreground">{mutation.data.message}</p>
      </div>
    );
  }

  return (
    <form
      className="flex flex-col gap-5"
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="enq-name" className={labelBase}>
            Your name <span className="text-destructive">*</span>
          </label>
          <input
            id="enq-name"
            required
            maxLength={120}
            autoComplete="name"
            className={inputBase}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="enq-phone" className={labelBase}>
            Phone <span className="text-destructive">*</span>
          </label>
          <input
            id="enq-phone"
            required
            type="tel"
            maxLength={30}
            autoComplete="tel"
            placeholder="+20 100 000 0000"
            className={inputBase}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          <p className="text-[12px] text-muted-foreground">We will call you on this number.</p>
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <label htmlFor="enq-email" className={labelBase}>
          Email
        </label>
        <input
          id="enq-email"
          type="email"
          maxLength={200}
          autoComplete="email"
          className={inputBase}
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <p className="text-[12px] text-muted-foreground">
          Optional — add it and we will send you a confirmation.
        </p>
      </div>


      {type === "trial" ? (
        <>
          <div className="flex flex-col gap-1.5">
            <label htmlFor="enq-goal" className={labelBase}>
              What are you training for
            </label>
            <input
              id="enq-goal"
              maxLength={200}
              placeholder={goalPlaceholder}
              className={inputBase}
              value={goal}
              onChange={(e) => setGoal(e.target.value)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <label htmlFor="enq-time" className={labelBase}>
              When suits you
            </label>
            <input
              id="enq-time"
              maxLength={120}
              placeholder="Weekday evenings, weekend mornings…"
              className={inputBase}
              value={preferredTime}
              onChange={(e) => setPreferredTime(e.target.value)}
            />
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="enq-message" className={labelBase}>
            Message
          </label>
          <textarea
            id="enq-message"
            rows={5}
            maxLength={2000}
            className={`${inputBase} resize-y leading-relaxed`}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
        </div>
      )}

      {/* Not display:none — some bots skip hidden fields but fill visually
          offscreen ones. aria-hidden and tabIndex keep it away from people and
          assistive tech. */}
      <div aria-hidden className="absolute left-[-9999px] h-0 w-0 overflow-hidden">
        <label htmlFor="enq-website">Leave this empty</label>
        <input
          id="enq-website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
        />
      </div>

      {mutation.isError && (
        <p role="alert" className="text-[13px] text-destructive">
          {apiErrorMessage(mutation.error, "Something went wrong — please try again, or call us.")}
        </p>
      )}

      {/* ctaClasses, and full width on a phone.
          Two changes, both about consistency. The style was a one-off — no 2px
          border, no press feedback, and a `hover:bg-primary-hover` colour
          change that the design brief in section.tsx explicitly rules out for
          red buttons — so it now wears the same contract as every other primary
          action. And `w-fit` left the submit as a ~200px button floating at the
          left edge under a column of full-width fields, which on a phone reads
          as a secondary control; the form's own action should be as wide as the
          form. */}
      <button
        type="submit"
        disabled={mutation.isPending}
        className={ctaClasses("primary", "w-full disabled:opacity-50 sm:w-fit")}
      >
        {mutation.isPending ? "Sending…" : submitLabel}
      </button>
    </form>
  );
}
