"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { formatPrice } from "@/lib/format";
import { formatEgyptianPhone } from "@/lib/gym-format";
import { BRAND } from "@/lib/brand";
import { WhatsAppIcon, WhatsAppLink } from "@/components/public/whatsapp";

/**
 * What to do after choosing InstaPay.
 *
 * Shown twice, on purpose. In the join funnel it sits under the selected
 * option, because the number is the whole point of picking this method — a
 * member deciding how to pay wants to see it before committing, not after.
 * On the result page it is what they come back to when they pay later in the
 * day, or reopen the confirmation on a different device.
 */
export function InstapayInstructions({
  amountMinorUnits = null,
}: {
  amountMinorUnits?: number | null;
}) {
  return (
    <ol className="flex flex-col gap-4">
      <Step index={1} title="Send the transfer">
        <p className="text-[13px] text-muted-foreground">
          Open your banking app or InstaPay and transfer{" "}
          {amountMinorUnits !== null ? (
            <span className="font-semibold text-foreground">{formatPrice(amountMinorUnits)}</span>
          ) : (
            "the amount on your invoice"
          )}{" "}
          to:
        </p>
        <InstapayNumber />
      </Step>

      <Step index={2} title="Share the confirmation">
        <p className="text-[13px] text-muted-foreground">
          Send us the transfer receipt on WhatsApp so we can match it to your membership.
        </p>
        <WhatsAppLink
          message={`Hi ${BRAND.name}, I have just sent an InstaPay transfer for my membership. Here is the receipt.`}
          className="mt-2.5 inline-flex items-center gap-2 bg-[#25D366] px-4 py-2.5 font-mono text-[12px] font-semibold tracking-[0.06em] text-black uppercase transition-opacity hover:opacity-90"
        >
          <WhatsAppIcon className="size-4" />
          Send receipt on WhatsApp
        </WhatsAppLink>
      </Step>

      <Step index={3} title="We activate your membership">
        <p className="text-[13px] text-muted-foreground">
          Your place is reserved the moment you finish here. Once we confirm the transfer during
          opening hours, your membership goes active and you will get an email.
        </p>
      </Step>
    </ol>
  );
}

function Step({
  index,
  title,
  children,
}: {
  index: number;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <li className="flex gap-3.5">
      <span className="flex size-6 shrink-0 items-center justify-center border border-primary text-[12px] font-semibold text-primary-soft">
        {index}
      </span>
      <div className="min-w-0 flex-1">
        <span className="block text-[13px] font-semibold text-foreground">{title}</span>
        <div className="mt-1">{children}</div>
      </div>
    </li>
  );
}

/**
 * The InstaPay number with a copy button.
 *
 * Copying matters here: this number is about to be typed into a banking app,
 * and a single transposed digit sends a member's money to a stranger.
 */
function InstapayNumber() {
  const [copied, setCopied] = useState(false);
  const display = formatEgyptianPhone(BRAND.instapay);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(BRAND.instapay);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard access can be refused outright — over plain HTTP, or by a
      // browser that gates it behind a permission. The number is on screen
      // either way, so there is nothing to recover from and nothing to say.
    }
  };

  return (
    <div className="mt-2.5 flex flex-wrap items-center justify-between gap-3 border border-border bg-surface-1 px-4 py-3">
      <span>
        <span className="block font-mono text-[11px] tracking-[0.12em] text-muted-foreground uppercase">
          InstaPay number
        </span>
        <span className="block font-mono text-[17px] font-semibold tracking-[0.04em] text-foreground">
          {display}
        </span>
      </span>
      <button
        type="button"
        onClick={copy}
        aria-label={`Copy the InstaPay number ${display}`}
        className="ui-action ui-action--outline flex shrink-0 items-center gap-1.5 border border-border px-3 py-2 font-mono text-[11px] font-semibold tracking-[0.06em] text-muted-foreground uppercase transition-colors hover:border-primary hover:text-primary-soft"
      >
        {copied ? (
          <Check className="size-3.5" strokeWidth={2} />
        ) : (
          <Copy className="size-3.5" strokeWidth={1.5} />
        )}
        {copied ? "Copied" : "Copy"}
      </button>
    </div>
  );
}
