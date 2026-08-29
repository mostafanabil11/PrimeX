import { apiClient } from "./client";
import type { Coupon, CreateCouponInput } from "@/types/coupon";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export type CouponType = "percentage" | "fixed" | "free_shipping";

export interface AppliedCoupon {
  code: string;
  type: CouponType;
  discountAmount: number;
  freeShipping: boolean;
}

// `guest` is ignored by the server for signed-in callers, whose own cart and
// identity always win. It exists so a guest can preview a code against the
// basket in their browser, which the server has no other way to see.
export async function validateCoupon(
  code: string,
  guest?: { email?: string | null; items?: { productId: string; size: string; quantity: number }[] },
): Promise<AppliedCoupon> {
  const res = await apiClient.post<ApiEnvelope<AppliedCoupon>>("/coupons/validate", {
    code,
    ...(guest?.email ? { email: guest.email } : {}),
    ...(guest?.items ? { items: guest.items } : {}),
  });
  return res.data.data;
}

// --- Admin ---

export async function getCoupons(): Promise<Coupon[]> {
  const res = await apiClient.get<ApiEnvelope<Coupon[]>>("/coupons");
  return res.data.data;
}

export async function getCoupon(id: string): Promise<Coupon> {
  const res = await apiClient.get<ApiEnvelope<Coupon>>(`/coupons/${id}`);
  return res.data.data;
}

export async function createCoupon(data: CreateCouponInput): Promise<Coupon> {
  const res = await apiClient.post<ApiEnvelope<Coupon>>("/coupons", data);
  return res.data.data;
}

export async function updateCoupon(id: string, data: Partial<CreateCouponInput>): Promise<Coupon> {
  const res = await apiClient.patch<ApiEnvelope<Coupon>>(`/coupons/${id}`, data);
  return res.data.data;
}

export async function deleteCoupon(id: string): Promise<void> {
  await apiClient.delete(`/coupons/${id}`);
}
