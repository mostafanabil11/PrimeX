"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { getCoupon } from "@/lib/api/coupons";
import { CouponForm } from "@/components/admin/coupon-form";

export default function EditCouponPage() {
  const params = useParams<{ id: string }>();
  const { data: coupon, isLoading } = useQuery({
    queryKey: ["admin", "coupons", params.id],
    queryFn: () => getCoupon(params.id),
  });

  return (
    <div>
      <Link href="/admin/coupons" className="mb-6 inline-block text-[13px] text-muted-foreground underline">
        ← Back to coupons
      </Link>
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground">{coupon?.code ?? "Edit Coupon"}</h1>
      {isLoading || !coupon ? <div className="h-96 max-w-xl animate-pulse bg-muted" /> : <CouponForm coupon={coupon} />}
    </div>
  );
}
