import Link from "next/link";
import Image from "next/image";
import { formatPrice } from "@/lib/format";
import type { Product } from "@/types/product";

export function ProductCard({
  product,
  className,
}: {
  product: Product;
  className?: string;
}) {
  const onSale = product.discountPrice !== null;
  const percentOff = onSale
    ? Math.round((1 - product.discountPrice! / product.price) * 100)
    : 0;

  return (
    <Link href={`/products/${product.slug}`} className={`group block ${className ?? ""}`}>
      <div className="relative mb-4 aspect-3/4 overflow-hidden bg-muted">
        {product.images[0] && (
          <Image
            src={product.images[0]}
            alt={product.name}
            fill
            loading="eager"
            className="object-cover transition-transform duration-700 ease-in-out group-hover:scale-105"
            sizes="(min-width: 768px) 25vw, 70vw"
          />
        )}
        {onSale && (
          <span className="absolute top-3 left-3 bg-primary px-2.5 py-1 font-mono text-[11px] font-bold tracking-[0.05em] text-primary-foreground">
            −{percentOff}%
          </span>
        )}
      </div>
      <div className="flex items-start justify-between">
        <div>
          <h3 className="mb-1 text-body-md text-foreground">{product.name}</h3>
          <p className="text-[13px] text-muted-foreground">{product.color}</p>
        </div>
        <div className="text-right">
          <p className={`text-[12px] font-semibold tracking-[0.1em] ${onSale ? "text-primary-soft" : "text-foreground"}`}>
            {formatPrice(product.discountPrice ?? product.price)}
          </p>
          {onSale && (
            <p className="text-[11px] text-muted-foreground line-through">{formatPrice(product.price)}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
