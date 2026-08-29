import type { CouponType } from "@/lib/api/coupons";

export interface Coupon {
  _id: string;
  code: string;
  type: CouponType;
  value: number;
  minSubtotal: number;
  maxDiscountCap: number | null;
  startsAt: string | null;
  endsAt: string | null;
  usageLimit: number | null;
  usedCount: number;
  categories: string[];
  products: string[];
  excludeSaleItems: boolean;
  isActive: boolean;
  createdAt: string;
}

export interface CreateCouponInput {
  code: string;
  type: CouponType;
  value: number;
  minSubtotal: number;
  maxDiscountCap?: number | null;
  startsAt?: string | null;
  endsAt?: string | null;
  usageLimit?: number | null;
  categories?: string[];
  products?: string[];
  excludeSaleItems?: boolean;
  isActive?: boolean;
}
