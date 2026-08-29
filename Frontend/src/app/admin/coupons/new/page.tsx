"use client";

import Link from "next/link";
import { CouponForm } from "@/components/admin/coupon-form";

export default function NewCouponPage() {
  return (
    <div>
      <Link href="/admin/coupons" className="mb-6 inline-block text-[13px] text-muted-foreground underline">
        ← Back to coupons
      </Link>
      <h1 className="mb-8 font-heading text-headline-sm font-bold text-foreground">New Coupon</h1>
      <CouponForm />
    </div>
  );
}
