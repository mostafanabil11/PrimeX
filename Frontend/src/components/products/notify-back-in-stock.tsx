"use client";

import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { requestBackInStock } from "@/lib/api/back-in-stock";
import type { ProductSize } from "@/types/product";
import { apiErrorMessage } from "@/lib/api-error";

export function NotifyBackInStock({ productId, size }: { productId: string; size: ProductSize }) {
  const [email, setEmail] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const mutation = useMutation({
    mutationFn: () => requestBackInStock(productId, size, email),
    onSuccess: () => setSubmitted(true),
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save your request")),
  });

  if (submitted) {
    return (
      <p className="mb-10 border border-border bg-muted px-4 py-3 text-[13px] text-foreground">
        We&apos;ll email you at {email} when size {size} is back.
      </p>
    );
  }

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="mb-10 flex gap-2"
    >
      <input
        type="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email for a restock alert"
        className="min-w-0 flex-1 border border-input bg-background px-4 py-3 text-base md:text-sm text-foreground outline-none focus:border-foreground"
      />
      <button
        type="submit"
        disabled={mutation.isPending}
        className="ui-action inline-flex shrink-0 border border-foreground px-6 py-3 font-mono text-[12px] font-medium tracking-[0.05em] text-foreground uppercase transition-colors hover:border-primary hover:bg-primary/10 disabled:opacity-50"
      >
        {mutation.isPending ? "…" : "Notify Me"}
      </button>
    </form>
  );
}
