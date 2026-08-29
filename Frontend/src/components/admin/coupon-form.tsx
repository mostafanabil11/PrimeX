"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { createCoupon, updateCoupon } from "@/lib/api/coupons";
import type { Coupon, CreateCouponInput } from "@/types/coupon";
import type { CouponType } from "@/lib/api/coupons";
import { apiErrorMessage } from "@/lib/api-error";

const inputClass =
  "w-full border border-border bg-background px-4 py-2.5 text-sm text-foreground outline-none focus:border-foreground";
const labelClass = "mb-1.5 block font-mono text-[11px] font-semibold tracking-[0.1em] text-foreground uppercase";

function toDateInputValue(iso: string | null): string {
  if (!iso) return "";
  return iso.slice(0, 10);
}

export function CouponForm({ coupon }: { coupon?: Coupon }) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const isEdit = !!coupon;

  const [code, setCode] = useState(coupon?.code ?? "");
  const [type, setType] = useState<CouponType>(coupon?.type ?? "percentage");
  const [value, setValue] = useState(coupon ? String(coupon.type === "fixed" ? coupon.value / 100 : coupon.value) : "");
  const [minSubtotal, setMinSubtotal] = useState(coupon ? String(coupon.minSubtotal / 100) : "0");
  const [maxDiscountCap, setMaxDiscountCap] = useState(coupon?.maxDiscountCap ? String(coupon.maxDiscountCap / 100) : "");
  const [startsAt, setStartsAt] = useState(toDateInputValue(coupon?.startsAt ?? null));
  const [endsAt, setEndsAt] = useState(toDateInputValue(coupon?.endsAt ?? null));
  const [usageLimit, setUsageLimit] = useState(coupon?.usageLimit ? String(coupon.usageLimit) : "");
  const [excludeSaleItems, setExcludeSaleItems] = useState(coupon?.excludeSaleItems ?? false);
  const [isActive, setIsActive] = useState(coupon?.isActive ?? true);

  const mutation = useMutation({
    mutationFn: () => {
      const payload: Partial<CreateCouponInput> = {
        code: code.trim().toUpperCase(),
        type,
        value: type === "fixed" ? Math.round(parseFloat(value || "0") * 100) : Math.round(parseFloat(value || "0")),
        minSubtotal: Math.round(parseFloat(minSubtotal || "0") * 100),
        maxDiscountCap: maxDiscountCap.trim() ? Math.round(parseFloat(maxDiscountCap) * 100) : null,
        startsAt: startsAt ? new Date(startsAt).toISOString() : null,
        endsAt: endsAt ? new Date(endsAt).toISOString() : null,
        usageLimit: usageLimit.trim() ? parseInt(usageLimit, 10) : null,
        excludeSaleItems,
        isActive,
      };
      return isEdit ? updateCoupon(coupon._id, payload) : createCoupon(payload as CreateCouponInput);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
      toast.success(isEdit ? "Coupon updated" : "Coupon created");
      router.push("/admin/coupons");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not save coupon")),
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate();
      }}
      className="max-w-xl space-y-5"
    >
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Code</label>
          <input
            required
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            className={`${inputClass} uppercase`}
          />
        </div>
        <div>
          <label className={labelClass}>Type</label>
          <select value={type} onChange={(e) => setType(e.target.value as CouponType)} className={inputClass}>
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
            <option value="free_shipping">Free shipping</option>
          </select>
        </div>
      </div>

      {type !== "free_shipping" && (
        <div>
          <label className={labelClass}>
            {type === "percentage" ? "Percentage off (1–100)" : "Amount off (EGP)"}
          </label>
          <input
            required
            type="number"
            min={type === "percentage" ? 1 : 0.01}
            max={type === "percentage" ? 100 : undefined}
            step={type === "percentage" ? 1 : 0.01}
            value={value}
            onChange={(e) => setValue(e.target.value)}
            className={inputClass}
          />
        </div>
      )}

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Minimum Subtotal (EGP)</label>
          <input type="number" min="0" step="0.01" value={minSubtotal} onChange={(e) => setMinSubtotal(e.target.value)} className={inputClass} />
        </div>
        {type === "percentage" && (
          <div>
            <label className={labelClass}>Max Discount Cap (EGP, optional)</label>
            <input
              type="number"
              min="0"
              step="0.01"
              value={maxDiscountCap}
              onChange={(e) => setMaxDiscountCap(e.target.value)}
              className={inputClass}
            />
          </div>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className={labelClass}>Starts (optional)</label>
          <input type="date" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClass} />
        </div>
        <div>
          <label className={labelClass}>Ends (optional)</label>
          <input type="date" value={endsAt} onChange={(e) => setEndsAt(e.target.value)} className={inputClass} />
        </div>
      </div>

      <div>
        <label className={labelClass}>Total Usage Limit (optional)</label>
        <input
          type="number"
          min="1"
          value={usageLimit}
          onChange={(e) => setUsageLimit(e.target.value)}
          placeholder="Unlimited"
          className={inputClass}
        />
        <p className="mt-1 text-[11px] text-muted-foreground">Each customer may redeem a coupon once, regardless of this limit.</p>
      </div>

      <div className="flex flex-wrap gap-6">
        <label className="flex items-center gap-2 text-[13px] text-foreground">
          <input type="checkbox" checked={excludeSaleItems} onChange={(e) => setExcludeSaleItems(e.target.checked)} />
          Exclude sale items
        </label>
        {isEdit && (
          <label className="flex items-center gap-2 text-[13px] text-foreground">
            <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
            Active
          </label>
        )}
      </div>

      <div className="flex gap-3 pt-2">
        <button
          type="submit"
          disabled={mutation.isPending}
          className="bg-primary px-8 py-3 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90 disabled:opacity-50"
        >
          {mutation.isPending ? "Saving…" : isEdit ? "Save Changes" : "Create Coupon"}
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/coupons")}
          className="border border-border px-8 py-3 text-button font-medium tracking-[0.05em] text-foreground uppercase transition-colors hover:bg-muted"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
