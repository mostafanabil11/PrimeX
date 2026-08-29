import Image from "next/image";
import Link from "next/link";
import { formatPrice } from "@/lib/format";
import type { RelatedProduct } from "@/types/product";

export function RelatedProducts({ products }: { products: RelatedProduct[] }) {
  if (products.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-(--spacing-container-max) border-t border-border px-margin-mobile py-stack-lg md:px-margin-desktop">
      <h2 className="mb-8 font-heading text-headline-sm font-bold text-foreground">You Might Also Like</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {products.map((product) => (
          <Link key={product._id} href={`/products/${product.slug}`} className="group">
            <div className="relative mb-3 aspect-3/4 overflow-hidden bg-muted">
              {product.images[0] && (
                <Image
                  src={product.images[0]}
                  alt={product.name}
                  fill
                  loading="eager"
                  className="object-cover transition-opacity group-hover:opacity-80"
                  sizes="(min-width: 768px) 25vw, 50vw"
                />
              )}
            </div>
            <p className="text-[13px] text-foreground">{product.name}</p>
            <p className="text-[13px] text-muted-foreground">{formatPrice(product.discountPrice ?? product.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
