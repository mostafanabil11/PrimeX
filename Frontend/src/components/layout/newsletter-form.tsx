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
      className="flex max-w-xs gap-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
        className="min-w-0 flex-1 border border-border bg-background px-3 py-2.5 text-[13px] text-foreground outline-none focus:border-foreground"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="shrink-0 border border-foreground px-4 py-2.5 font-mono text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase transition-colors hover:border-primary hover:bg-primary hover:text-primary-foreground disabled:opacity-50"
      >
        Join
      </button>
    </form>
  );
}
