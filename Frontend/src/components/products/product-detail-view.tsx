"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import { useCart } from "@/hooks/use-cart";
import { formatPrice } from "@/lib/format";
import { recordRecentlyViewed } from "@/lib/recently-viewed";
import { StarRating } from "./star-rating";
import { WishlistButton } from "./wishlist-button";
import { NotifyBackInStock } from "./notify-back-in-stock";
import type { ProductDetail, ProductSize } from "@/types/product";

// Everything here needs client-side state (active image, selected size) or
// browser APIs (the cart store, toasts) — the product data itself is fetched
// server-side by the page and passed in as a prop, so there's no client-side
// fetch or loading skeleton for the content search engines and link
// previews actually care about.
export function ProductDetailView({ product }: { product: ProductDetail }) {
  const { addItem } = useCart();
  const [selectedSize, setSelectedSize] = useState<ProductSize | null>(null);
  const [activeImage, setActiveImage] = useState(0);

  const selectedStock = product.sizes.find((s) => s.size === selectedSize)?.stock ?? 0;

  useEffect(() => {
    recordRecentlyViewed({
      _id: product._id,
      name: product.name,
      slug: product.slug,
      image: product.images[0] ?? null,
      price: product.price,
      discountPrice: product.discountPrice,
    });
  }, [product._id, product.name, product.slug, product.images, product.price, product.discountPrice]);

  function handleAddToBag() {
    if (!selectedSize) {
      toast.error("Please select a size");
      return;
    }
    addItem(product._id, selectedSize, 1, {
      slug: product.slug,
      name: product.name,
      color: product.color,
      price: product.discountPrice ?? product.price,
      image: product.images[0] ?? "",
    });
    toast.success(`${product.name} added to your bag`);
  }

  return (
    <div className="mx-auto grid w-full max-w-(--spacing-container-max) grid-cols-1 gap-gutter px-margin-mobile py-stack-xl md:grid-cols-2 md:px-margin-desktop">
      {/* Images */}
      <div>
        <div className="relative mb-4 aspect-3/4 overflow-hidden bg-muted">
          {product.images[activeImage] && (
            <Image
              src={product.images[activeImage]}
              alt={product.name}
              fill
              loading="eager"
              fetchPriority="high"
              className="object-cover"
              sizes="(min-width: 768px) 50vw, 100vw"
            />
          )}
        </div>
        {product.images.length > 1 && (
          <div className="flex gap-3">
            {product.images.map((img, i) => (
              <button
                key={img}
                type="button"
                onClick={() => setActiveImage(i)}
                className={`relative aspect-3/4 w-20 overflow-hidden bg-muted transition-opacity ${
                  i === activeImage ? "opacity-100 ring-1 ring-foreground" : "opacity-60 hover:opacity-100"
                }`}
              >
                <Image src={img} alt={`${product.name} ${i + 1}`} fill loading="eager" className="object-cover" sizes="80px" />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Info */}
      <div>
        <h1 className="mb-2 font-heading text-headline-md font-bold text-foreground">
          {product.name}
        </h1>
        <p className="mb-2 text-body-md text-muted-foreground">{product.color}</p>
        {product.reviewCount > 0 && (
          <a href="#reviews" className="mb-4 flex items-center gap-2">
            <StarRating value={product.averageRating} />
            <span className="text-[13px] text-muted-foreground">
              {product.averageRating.toFixed(1)} ({product.reviewCount})
            </span>
          </a>
        )}

        <div className="mb-8 flex items-center gap-3">
          <p className="text-headline-sm font-heading text-foreground">
            {formatPrice(product.discountPrice ?? product.price)}
          </p>
          {product.discountPrice && (
            <p className="text-body-md text-muted-foreground line-through">
              {formatPrice(product.price)}
            </p>
          )}
        </div>

        {/* Size selector */}
        <div className="mb-8">
          <div className="mb-3 flex items-center justify-between">
            <p id="size-label" className="font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase">
              Size
            </p>
            <Link
              href="/size-guide"
              className="text-[12px] text-muted-foreground underline underline-offset-2 hover:text-foreground"
            >
              Size Guide
            </Link>
          </div>
          <div role="radiogroup" aria-labelledby="size-label" className="flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <button
                key={s.size}
                type="button"
                role="radio"
                aria-checked={selectedSize === s.size}
                aria-disabled={s.stock === 0}
                disabled={s.stock === 0}
                onClick={() => setSelectedSize(s.size)}
                className={`flex h-12 w-14 items-center justify-center border text-sm font-medium transition-colors ${
                  s.stock === 0
                    ? "cursor-not-allowed border-border text-muted-foreground/40 line-through"
                    : selectedSize === s.size
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-border text-foreground hover:border-foreground"
                }`}
              >
                {s.size}
                {s.stock === 0 && <span className="sr-only"> — Out of stock</span>}
              </button>
            ))}
          </div>
          {selectedSize && selectedStock > 0 && selectedStock <= 3 && (
            <p className="mt-2 text-[12px] text-muted-foreground">Only {selectedStock} left</p>
          )}
        </div>

        <div className="mb-4 flex gap-3">
          <button
            type="button"
            onClick={handleAddToBag}
            className="flex-1 bg-primary py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary-hover"
          >
            Add to Bag
          </button>
          <WishlistButton productId={product._id} />
        </div>

        {selectedSize && selectedStock === 0 && (
          <NotifyBackInStock productId={product._id} size={selectedSize} />
        )}

        {product.description && (
          <p className="mb-10 text-body-md text-muted-foreground">{product.description}</p>
        )}

        {/* Related colors */}
        {product.relatedColors.length > 0 && (
          <div>
            <p className="mb-3 font-mono text-[12px] font-semibold tracking-[0.1em] text-foreground uppercase">
              Also Available In
            </p>
            <div className="flex flex-wrap gap-3">
              {product.relatedColors.map((sibling) => (
                <Link
                  key={sibling._id}
                  href={`/products/${sibling.slug}`}
                  className="group relative aspect-3/4 w-20 overflow-hidden bg-muted"
                  title={sibling.color}
                >
                  {sibling.images[0] && (
                    <Image
                      src={sibling.images[0]}
                      alt={sibling.color}
                      fill
                      className="object-cover transition-opacity group-hover:opacity-80"
                      sizes="80px"
                    />
                  )}
                </Link>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
