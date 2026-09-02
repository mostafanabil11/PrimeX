"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { subscribeToNewsletter } from "@/lib/api/newsletter";

export function NewsletterForm() {
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);

  const mutation = useMutation({
    mutationFn: () => subscribeToNewsletter(email),
    onSuccess: () => setSubscribed(true),
  });

  if (subscribed) {
    return <p className="text-[13px] text-foreground">You&apos;re on the list.</p>;
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="flex w-full max-w-xs gap-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        autoComplete="email"
        // inputMode + autoComplete together are what turn this from "a box" into
        // one tap and a keychain suggestion on a phone: the keyboard opens with
        // @ and . on the front row, and the address the visitor already uses is
        // offered above it.
        inputMode="email"
        aria-label="Your email address"
        className="min-h-11 min-w-0 flex-1 border border-input bg-background px-3 py-2.5 text-base text-foreground outline-none focus:border-foreground md:text-[13px]"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="ui-action inline-flex min-h-11 shrink-0 border border-foreground px-4 font-mono text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
      >
        {mutation.isPending ? "…" : "Join"}
      </button>
    </form>
  );
}
