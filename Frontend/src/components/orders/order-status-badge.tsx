import type { FulfillmentStatus, PaymentStatus } from "@/types/order";

const FULFILLMENT_LABEL: Record<FulfillmentStatus, string> = {
  unfulfilled: "Unfulfilled",
  processing: "Processing",
  shipped: "Shipped",
  delivered: "Delivered",
  cancelled: "Cancelled",
};

const PAYMENT_LABEL: Record<PaymentStatus, string> = {
  pending: "Payment Pending",
  paid: "Paid",
  failed: "Payment Failed",
  refunded: "Refunded",
};

export function OrderStatusBadge({
  fulfillmentStatus,
  paymentStatus,
}: {
  fulfillmentStatus: FulfillmentStatus;
  paymentStatus: PaymentStatus;
}) {
  const isNegative = fulfillmentStatus === "cancelled" || paymentStatus === "failed";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span
        className={`border px-2.5 py-1 font-mono text-[11px] font-semibold tracking-[0.05em] uppercase ${
          isNegative ? "border-destructive text-destructive" : "border-border text-foreground"
        }`}
      >
        {FULFILLMENT_LABEL[fulfillmentStatus]}
      </span>
      <span className="font-mono text-[11px] font-medium tracking-[0.05em] text-muted-foreground uppercase">
        {PAYMENT_LABEL[paymentStatus]}
      </span>
    </div>
  );
}
