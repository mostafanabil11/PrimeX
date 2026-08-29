import type { Metadata } from "next";
import Link from "next/link";
import { requireShop } from "@/lib/features";

export const metadata: Metadata = {
  title: "Shipping & Returns — Valiant",
  description: "Delivery times, shipping rates, and how to return or exchange an order.",
};

export default function ShippingReturnsPage() {
  requireShop();

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <div className="mx-auto max-w-2xl">
        <h1 className="mb-12 font-heading text-headline-sm font-bold text-foreground md:text-headline-md">
          Shipping &amp; Returns
        </h1>

        <div className="space-y-10 text-[14px] leading-relaxed text-muted-foreground">
          <section>
            <h2 className="mb-3 font-heading text-headline-sm font-bold text-foreground">Shipping Rates</h2>
            <p>
              We currently ship within Egypt only. Standard shipping is a flat EGP 50, and free on orders over
              EGP 3,000 — the discount is applied automatically at checkout, no code needed.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-headline-sm font-bold text-foreground">Delivery Time</h2>
            <p>
              Orders are typically processed within 1–2 business days and delivered within 3–7 business days,
              depending on your governorate. Cash-on-delivery orders begin processing as soon as they&apos;re
              placed; card orders begin as soon as payment is confirmed.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-headline-sm font-bold text-foreground">Tracking Your Order</h2>
            <p>
              Once your order ships, you&apos;ll receive an email and a tracking number will appear on your
              order in{" "}
              <Link href="/account/orders" className="text-foreground underline">
                Order History
              </Link>
              .
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-headline-sm font-bold text-foreground">Cancelling Before Shipment</h2>
            <p>
              Changed your mind? You can cancel an order yourself, free of charge, any time before it has
              shipped — open the order in{" "}
              <Link href="/account/orders" className="text-foreground underline">
                Order History
              </Link>{" "}
              and select Cancel. Nothing is charged for a cancelled cash-on-delivery order.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-headline-sm font-bold text-foreground">Returns &amp; Exchanges</h2>
            <p>
              We accept returns within 14 days of delivery for unworn items in their original condition with
              tags attached. To start a return or exchange, contact us with your order number and we&apos;ll
              walk you through the next steps.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-headline-sm font-bold text-foreground">Refunds</h2>
            <p>
              Once a returned item is received and inspected, refunds for card payments are issued to your
              original payment method; cash-on-delivery refunds are arranged directly with our support team.
              Refunds are typically reflected within a few business days.
            </p>
          </section>

          <section>
            <h2 className="mb-3 font-heading text-headline-sm font-bold text-foreground">Need Help?</h2>
            <p>
              Reach out any time at{" "}
              <a href="mailto:support@valiant.com" className="text-foreground underline">
                support@valiant.com
              </a>{" "}
              — see our <Link href="/contact" className="text-foreground underline">Contact</Link> page for
              more ways to get in touch.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
