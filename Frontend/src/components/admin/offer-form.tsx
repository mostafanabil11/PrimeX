"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createOffer, updateOffer } from "@/lib/api/offers";
import { getPlansAdmin } from "@/lib/api/gym";
import { formatPrice } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api-error";
import type { Offer, OfferInput, OfferType } from "@/types/offer";
import type { Plan } from "@/types/gym";

const inputClass =
  "w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground";
const labelClass =
  "mb-1.5 block text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase";

function toDateInputValue(iso: string | null): string {
  return iso ? iso.slice(0, 10) : "";
}

function planMonths(plan: Plan): number | null {
  if (plan.durationUnit === "month") return plan.durationValue;
  if (plan.durationUnit === "year") return plan.durationValue * 12;
  return null;
}

function termLabel(months: number): string {
  if (months === 1) return "Monthly";
  if (months === 12) return "Annual";
  return `${months} months`;
}

export function OfferForm({ offer }: { offer?: Offer }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!offer;

  const [name, setName] = useState(offer?.name ?? "");
  const [type, setType] = useState<OfferType>(offer?.type ?? "percentage");
  const [value, setValue] = useState(
    offer ? String(offer.type === "fixed" ? offer.value / 100 : offer.value) : "",
  );
  const [tiers, setTiers] = useState<string[]>(offer?.tiers ?? []);
  const [durationMonths, setDurationMonths] = useState<number[]>(offer?.durationMonths ?? []);
  const [startsAt, setStartsAt] = useState(toDateInputValue(offer?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toDateInputValue(offer?.endsAt ?? null));
  const [isActive, setIsActive] = useState(offer?.isActive ?? true);

  // The targeting options come from the plans that actually exist, so a tier
  // the gym renamed cannot be selected here under its old name and silently
  // match nothing.
  const { data: plans } = useQuery({ queryKey: ["admin", "plans"], queryFn: getPlansAdmin });

  const activePlans = useMemo(() => (plans ?? []).filter((p) => p.isActive), [plans]);

  const allTiers = useMemo(
    () => [...new Set(activePlans.map((p) => p.tier).filter((t): t is string => !!t))],
    [activePlans],
  );

  const allTerms = useMemo(
    () =>
      [...new Set(activePlans.map(planMonths).filter((m): m is number => m !== null))].sort(
        (a, b) => a - b,
      ),
    [activePlans],
  );

  // Exactly which plans this offer will touch, priced. Targeting two axes is
  // easy to get subtly wrong — pick the wrong term and the offer silently
  // covers nothing — so the answer is shown rather than left to be discovered
  // on the live pricing page.
  const affected = useMemo(() => {
    const numericValue = Number(value) || 0;
    const minorValue = type === "fixed" ? Math.round(numericValue * 100) : numericValue;

    return activePlans
      .filter((plan) => {
        if (tiers.length > 0 && (!plan.tier || !tiers.includes(plan.tier))) return false;
        const months = planMonths(plan);
        if (durationMonths.length > 0 && (months === null || !durationMonths.includes(months))) {
          return false;
        }
        return true;
      })
      .map((plan) => {
        const discount =
          type === "percentage"
            ? Math.round((plan.priceMinorUnits * minorValue) / 100)
            : minorValue;
        return {
          plan,
          newPrice: Math.max(0, plan.priceMinorUnits - discount),
        };
      })
      .sort((a, b) => a.plan.sortOrder - b.plan.sortOrder);
  }, [activePlans, tiers, durationMonths, type, value]);

  const mutation = useMutation({
    mutationFn: () => {
      const numericValue = Number(value) || 0;
      const payload: OfferInput = {
        name: name.trim(),
        type,
        // Percentages are whole points; a fixed amount is entered in pounds and
        // stored in piastres, matching every other money field in the admin.
        value: type === "fixed" ? Math.round(numericValue * 100) : Math.round(numericValue),
        tiers,
        durationMonths,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        // End of the chosen day, not the start of it. An offer set to end on
        // the 30th should run through the 30th — cutting it off at midnight
        // takes a day off every promotion the gym runs.
        endsAt: endsAt ? new Date(`${endsAt}T23:59:59.999`).toISOString() : null,
        isActive,
      };
      return isEdit ? updateOffer(offer._id, payload) : createOffer(payload);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "offers"] });
      toast.success(isEdit ? "Offer updated" : "Offer created");
      router.push("/admin/offers");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save offer")),
  });

  const toggle = <T,>(list: T[], item: T, set: (next: T[]) => void) =>
    set(list.includes(item) ? list.filter((x) => x !== item) : [...list, item]);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="max-w-2xl space-y-6"
    >
      <div>
        <label className={labelClass}>Offer name</label>
        <input
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Ramadan Offer"
          className={inputClass}
        />
        <p className="mt-1.5 text-[12px] text-muted-foreground">
          Shown on the pricing card as the badge, so name it the way you would advertise it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Discount type</label>
          <select
            value={type}
            onChange={(e) => setType(e.target.value as OfferType)}
            className={inputClass}
          >
            <option value="percentage">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
          </select>
        </div>
        <div>
          <label className={labelClass}>{type === "percentage" ? "Percent" : "Amount (EGP)"}</label>
          <input
            required
            type="number"
            min="0"
            max={type === "percentage" ? "100" : undefined}
            step={type === "percentage" ? "1" : "0.01"}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
          />
        </div>
      </div>

      <fieldset className="border-t border-border pt-5">
        <legend className="sr-only">What the offer applies to</legend>

        <div className="mb-5">
          <span className={labelClass}>Terms</span>
          <p className="mb-2.5 text-[12px] text-muted-foreground">
            Leave everything unticked to cover every length.
          </p>
          <div className="flex flex-wrap gap-2">
            {allTerms.map((months) => (
              <Chip
                key={months}
                selected={durationMonths.includes(months)}
                onClick={() => toggle(durationMonths, months, setDurationMonths)}
              >
                {termLabel(months)}
              </Chip>
            ))}
          </div>
        </div>

        <div>
          <span className={labelClass}>Tiers</span>
          <p className="mb-2.5 text-[12px] text-muted-foreground">
            Leave everything unticked to cover every tier.
          </p>
          <div className="flex flex-wrap gap-2">
            {allTiers.map((tier) => (
              <Chip
                key={tier}
                selected={tiers.includes(tier)}
                onClick={() => toggle(tiers, tier, setTiers)}
              >
                {tier}
              </Chip>
            ))}
          </div>
        </div>
      </fieldset>

      <div className="grid grid-cols-2 gap-4 border-t border-border pt-5">
        <div>
          <label className={labelClass}>Starts</label>
          <input
            type="date"
            value={startsAt}
            onChange={(e) => setStartsAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>Ends</label>
          <input
            type="date"
            value={endsAt}
            onChange={(e) => setEndsAt(e.target.value)}
            className={inputClass}
          />
        </div>
        <p className="col-span-2 -mt-1 text-[12px] text-muted-foreground">
          Leave blank to run until you switch it off. An end date is safer — a promotion nobody
          remembers to stop is still on the website in six months.
        </p>
      </div>

      <label className="flex items-center gap-3 border-t border-border pt-5">
        <input
          type="checkbox"
          checked={isActive}
          onChange={(e) => setIsActive(e.target.checked)}
          className="size-4 accent-primary"
        />
        <span className="text-sm text-foreground">
          Active
          <span className="ml-2 text-[12px] text-muted-foreground">
            Untick to pause without losing the offer
          </span>
        </span>
      </label>

      <AffectedPlans rows={affected} />

      <div className="flex gap-3 border-t border-border pt-5">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-primary px-6 py-3 text-[12px] font-semibold tracking-[0.08em] text-primary-foreground uppercase disabled:opacity-40"
        >
          {mutation.isPending ? "Saving…" : isEdit ? "Save offer" : "Create offer"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/offers")}
          className="border border-border px-6 py-3 text-[12px] font-semibold tracking-[0.08em] text-foreground uppercase"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}

function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onClick}
      className={`border px-4 py-2 text-[12px] font-semibold tracking-[0.06em] uppercase transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border text-muted-foreground hover:border-foreground hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * A preview of exactly which plans this offer hits and what they become.
 *
 * The one rule it cannot show is what happens when two offers overlap — the
 * server takes the single best one and never stacks them — so that is stated
 * rather than implied.
 */
function AffectedPlans({ rows }: { rows: { plan: Plan; newPrice: number }[] }) {
  return (
    <div className="border border-border bg-surface-1 p-5">
      <p className="mb-3 text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase">
        This will change {rows.length} {rows.length === 1 ? "plan" : "plans"}
      </p>

      {rows.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">
          Nothing matches yet. Pick a term, a tier, or leave both empty to cover the whole grid.
        </p>
      ) : (
        <>
          <ul className="flex flex-col gap-1.5">
            {rows.map(({ plan, newPrice }) => (
              <li key={plan._id} className="flex justify-between gap-4 text-[13px]">
                <span className="text-muted-foreground">{plan.name}</span>
                <span className="shrink-0 tabular-nums">
                  <span className="text-muted-foreground line-through">
                    {formatPrice(plan.priceMinorUnits)}
                  </span>{" "}
                  <span className="font-semibold text-foreground">{formatPrice(newPrice)}</span>
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-4 border-t border-border pt-3 text-[12px] text-muted-foreground">
            If another offer also covers one of these plans, members get whichever single offer is
            cheaper. Discounts are never applied on top of one another.
          </p>
        </>
      )}
    </div>
  );
}
