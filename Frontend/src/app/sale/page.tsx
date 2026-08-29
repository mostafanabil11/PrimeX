import type { Metadata } from "next";
import { ProductBrowser } from "@/components/products/product-browser";
import { requireShop } from "@/lib/features";

export const metadata: Metadata = {
  title: "Sale — Valiant",
  description: "Selected styles, 20% off while stock lasts.",
};

export default function SalePage() {
  requireShop();

  return (
    <div>
      <section className="border-b border-border bg-background py-8 text-center md:py-10">
        <h1 className="font-heading text-headline-md font-bold tracking-[-0.02em] text-foreground md:text-display-lg-mobile">
          Sale
        </h1>
        <div className="mx-auto mt-4 h-[3px] w-12 bg-primary" />
        <p className="mx-auto mt-6 max-w-md px-margin-mobile text-body-md text-muted-foreground">
          20% off selected styles, while stock lasts.
        </p>
      </section>

      <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
        <ProductBrowser onSale />
      </div>
    </div>
  );
}
