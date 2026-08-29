"use client";

import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Plus, Trash2 } from "lucide-react";
import { getCoupons, deleteCoupon } from "@/lib/api/coupons";
import { formatPrice } from "@/lib/format";
import { apiErrorMessage } from "@/lib/api-error";

function describeCoupon(c: { type: string; value: number }): string {
  if (c.type === "percentage") return `${c.value}% off`;
  if (c.type === "fixed") return `${formatPrice(c.value)} off`;
  return "Free shipping";
}

export default function AdminCouponsPage() {
  const queryClient = useQueryClient();
  const { data: coupons, isLoading } = useQuery({ queryKey: ["admin", "coupons"], queryFn: getCoupons });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCoupon(id),
    onSuccess: () => {
      toast.success("Coupon deleted");
      queryClient.invalidateQueries({ queryKey: ["admin", "coupons"] });
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Could not delete coupon")),
  });

  return (
    <div>
      <div className="mb-8 flex items-center justify-between">
        <h1 className="font-heading text-headline-sm font-bold text-foreground">Coupons</h1>
        <Link
          href="/admin/coupons/new"
          className="flex items-center gap-2 bg-primary px-5 py-2.5 font-mono text-[12px] font-medium tracking-[0.05em] text-primary-foreground uppercase hover:bg-primary/90"
        >
          <Plus className="size-4" strokeWidth={2} />
          New Coupon
        </Link>
      </div>

      {isLoading || !coupons ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : coupons.length === 0 ? (
        <p className="text-[13px] text-muted-foreground">No coupons yet.</p>
      ) : (
        <div className="divide-y divide-border border-t border-b border-border">
          {coupons.map((c) => (
            <div key={c._id} className={`flex items-center justify-between gap-4 py-3 ${!c.isActive ? "opacity-50" : ""}`}>
              <Link href={`/admin/coupons/${c._id}`} className="min-w-0 flex-1 hover:underline">
                <p className="text-[13px] font-semibold tracking-[0.03em] text-foreground">
                  {c.code}
                  {!c.isActive && " (inactive)"}
                </p>
                <p className="text-[12px] text-muted-foreground">
                  {describeCoupon(c)} · {c.usedCount} used{c.usageLimit ? ` / ${c.usageLimit}` : ""}
                  {c.endsAt && ` · ends ${new Date(c.endsAt).toLocaleDateString()}`}
                </p>
              </Link>
              <button
                type="button"
                onClick={() => {
                  if (confirm(`Delete coupon "${c.code}"?`)) deleteMutation.mutate(c._id);
                }}
                className="shrink-0 p-2 text-muted-foreground hover:text-destructive"
                aria-label="Delete coupon"
              >
                <Trash2 className="size-4" strokeWidth={1.5} />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
