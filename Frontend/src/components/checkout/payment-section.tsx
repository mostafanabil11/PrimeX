"use client";

import { useEffect, useRef, useState } from "react";
import { Banknote, Lock, ShieldCheck } from "lucide-react";
import { VisaMark, MastercardMark, MeezaMark } from "./card-marks";

// Countdown starts turning amber/red once this many seconds remain, to give
// the customer visible warning before the session dies mid-entry.
const COUNTDOWN_WARN_AT = 60;

export type PaymentMethodType = "card" | "cod";

interface PaymentSectionProps {
  selected: PaymentMethodType;
  onSelect: (method: PaymentMethodType) => void;
  iframeUrl: string | null;
  expiresAt: string | null;
  onExpire: () => void;
  disabled?: boolean;
}

function useCountdown(expiresAt: string | null, onExpire: () => void) {
  const [remaining, setRemaining] = useState<number | null>(null);
  // Kept in a ref so the interval below doesn't need onExpire in its deps —
  // otherwise a new inline callback each render would restart the timer.
  const onExpireRef = useRef(onExpire);
  // Written in an effect, not the render body: mutating a ref while
  // rendering is unsafe under concurrent rendering (React may render more
  // than once before committing) and is what the ref rule is catching here.
  // No deps, so it re-runs after every render, keeping the ref current the
  // same way the old render-time assignment did.
  useEffect(() => {
    onExpireRef.current = onExpire;
  });

  useEffect(() => {
    if (!expiresAt) {
      // This effect subscribes to `expiresAt`, an external identity (a new
      // payment session) — clearing the countdown when it goes away is the
      // "external system changed" case the rule allows for.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRemaining(null);
      return;
    }

    const target = new Date(expiresAt).getTime();
    const tick = () => {
      const left = Math.max(0, Math.floor((target - Date.now()) / 1000));
      setRemaining(left);
      if (left === 0) {
        onExpireRef.current();
      }
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return remaining;
}

function formatCountdown(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

export function PaymentSection({
  selected,
  onSelect,
  iframeUrl,
  expiresAt,
  onExpire,
  disabled,
}: PaymentSectionProps) {
  const [frameLoaded, setFrameLoaded] = useState(false);
  const remaining = useCountdown(expiresAt, onExpire);
  const [billingMatchesShipping, setBillingMatchesShipping] = useState(true);

  useEffect(() => {
    // Resets the loaded flag when the iframe's own identity (its URL)
    // changes — the external-system-changed case the rule allows for.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFrameLoaded(false);
  }, [iframeUrl]);

  const options: {
    value: PaymentMethodType;
    label: string;
    marks?: React.ReactNode;
    icon?: React.ReactNode;
  }[] = [
    {
      value: "card",
      label: "Credit card",
      marks: (
        <span className="flex items-center gap-1">
          <MastercardMark className="h-[22px] w-[34px] rounded-[3px] border border-border/50 bg-white" />
          <VisaMark className="h-[22px] w-[34px] rounded-[3px] border border-border/50 bg-white" />
          <MeezaMark className="h-[22px] w-[34px] rounded-[3px] border border-border/50 bg-white" />
        </span>
      ),
    },
    {
      value: "cod",
      label: "Cash on Delivery (COD)",
    },
  ];

  return (
    <section aria-labelledby="payment-heading">
      <h2 id="payment-heading" className="mb-2 font-heading text-headline-sm font-bold text-foreground">
        Payment
      </h2>
      <p className="mb-4 text-sm text-muted-foreground">
        All transactions are secure and encrypted.
      </p>

      <div role="radiogroup" aria-labelledby="payment-heading" className="overflow-hidden rounded-md border border-border">
        {options.map((option, index) => {
          const isSelected = selected === option.value;
          return (
            <div key={option.value} className={index > 0 ? "border-t border-border" : undefined}>
              <button
                type="button"
                role="radio"
                aria-checked={isSelected}
                disabled={disabled}
                onClick={() => onSelect(option.value)}
                className={`flex w-full items-center justify-between px-4 py-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
                  isSelected ? "bg-[#f4f4f4] dark:bg-muted/40" : "bg-background"
                }`}
              >
                <div className="flex items-center gap-3">
                  <span
                    aria-hidden
                    className={`flex size-[18px] shrink-0 items-center justify-center rounded-full border transition-colors ${
                      isSelected ? "border-foreground" : "border-[#d9d9d9] dark:border-muted-foreground/50"
                    }`}
                  >
                    {isSelected && <span className="size-[8px] rounded-full bg-primary" />}
                  </span>

                  <span className="text-[14px] font-medium text-foreground">{option.label}</span>
                </div>

                {option.marks ?? option.icon}
              </button>

              {isSelected && option.value === "card" && iframeUrl && (
                <div className="bg-[#f4f4f4] dark:bg-muted/40 px-4 pb-4">
                  <div className="overflow-hidden rounded-lg border border-[#d9d9d9] bg-background shadow-sm dark:border-border">
                    <div className="flex items-center justify-between border-b border-[#e5e5e5] bg-[#fafafa] px-4 py-2.5 dark:border-border dark:bg-muted/60">
                      <span className="flex items-center gap-1.5 text-[12px] font-medium text-foreground">
                        <Lock className="size-3.5" strokeWidth={2} />
                        Secure Checkout
                      </span>
                      {remaining !== null && (
                        <span
                          className={`text-[12px] font-medium tabular-nums ${
                            remaining <= COUNTDOWN_WARN_AT ? "text-destructive" : "text-muted-foreground"
                          }`}
                        >
                          Expires in {formatCountdown(remaining)}
                        </span>
                      )}
                    </div>

                    <div className="relative">
                      {!frameLoaded && (
                        <div className="absolute inset-0 z-10 flex flex-col justify-center gap-3 bg-background px-5">
                          <div className="h-3 w-24 animate-pulse rounded bg-muted" />
                          <div className="h-10 w-full animate-pulse rounded bg-muted" />
                          <div className="flex gap-3">
                            <div className="h-10 w-1/2 animate-pulse rounded bg-muted" />
                            <div className="h-10 w-1/2 animate-pulse rounded bg-muted" />
                          </div>
                        </div>
                      )}
                      <iframe
                        key={iframeUrl}
                        src={iframeUrl}
                        title="Secure card payment"
                        onLoad={() => setFrameLoaded(true)}
                        className="block h-[380px] w-full border-0"
                        sandbox="allow-forms allow-scripts allow-same-origin allow-top-navigation allow-popups"
                      />
                    </div>

                    <div className="flex items-center gap-1.5 border-t border-[#e5e5e5] bg-[#fafafa] px-4 py-2 dark:border-border dark:bg-muted/60">
                      <ShieldCheck className="size-3.5 text-muted-foreground" strokeWidth={1.75} />
                      <span className="text-[11px] text-muted-foreground">
                        Payments are processed securely by Paymob. We never see or store your card details.
                      </span>
                    </div>
                  </div>

                  <label className="mt-4 flex cursor-pointer items-center gap-3 text-[14px] text-foreground">
                    <div className="relative flex items-center">
                      <input
                        type="checkbox"
                        checked={billingMatchesShipping}
                        onChange={(e) => setBillingMatchesShipping(e.target.checked)}
                        className="peer size-5 cursor-pointer appearance-none border border-concrete checked:border-primary checked:bg-primary focus:outline-none focus:ring-2 focus:ring-primary/30 dark:border-border"
                      />
                      <svg
                        className="pointer-events-none absolute left-1/2 top-1/2 size-3.5 -translate-x-1/2 -translate-y-1/2 text-background opacity-0 peer-checked:opacity-100"
                        xmlns="http://www.w3.org/2000/svg"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12"></polyline>
                      </svg>
                    </div>
                    <span>Use shipping address as billing address</span>
                  </label>
                </div>
              )}

              {isSelected && option.value === "cod" && (
                <div className="bg-[#f4f4f4] dark:bg-muted/40 px-4 pb-4 pt-1 text-center">
                  <div className="mx-auto mb-3 flex size-12 items-center justify-center rounded-full bg-background border border-border">
                    <Banknote className="size-6 text-foreground" strokeWidth={1.5} />
                  </div>
                  <p className="text-[14px] text-muted-foreground">
                    Have the exact amount ready for the courier. You can inspect your parcel before paying.
                  </p>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
