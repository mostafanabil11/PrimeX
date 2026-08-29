import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { AppliedCoupon } from "@/lib/api/coupons";

// Deliberately not persisted to storage — a coupon is re-validated by the
// server on every checkout attempt anyway (see OrdersService.checkout), so
// this is just enough state to carry the applied code and its preview
// discount across the client-side navigation from /cart to /checkout.
const APPLIED_COUPON_KEY = ["appliedCoupon"];

export function useAppliedCoupon() {
  const queryClient = useQueryClient();
  const { data } = useQuery<AppliedCoupon | null>({
    queryKey: APPLIED_COUPON_KEY,
    queryFn: () => null,
    initialData: null,
    staleTime: Infinity,
  });

  return {
    coupon: data ?? null,
    setCoupon: (coupon: AppliedCoupon | null) => queryClient.setQueryData(APPLIED_COUPON_KEY, coupon),
  };
}
