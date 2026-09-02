"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import { Link } from "@/i18n/navigation";
import { formatPrice } from "@/lib/format";
import { getRecentlyViewed, type RecentlyViewedEntry } from "@/lib/recently-viewed";

export function RecentlyViewed({ excludeId }: { excludeId?: string }) {
  // Read after mount only — localStorage isn't available during SSR, and
  // reading it on the server would just always return an empty list anyway.
  const [items, setItems] = useState<RecentlyViewedEntry[]>([]);

  useEffect(() => {
    // Reads localStorage, an external system unavailable during SSR — the
    // sanctioned case, not state derived from props or other React state.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setItems(getRecentlyViewed().filter((e) => e._id !== excludeId));
  }, [excludeId]);

  if (items.length === 0) return null;

  return (
    <section className="mx-auto w-full max-w-(--spacing-container-max) border-t border-border px-margin-mobile py-stack-lg md:px-margin-desktop">
      <h2 className="mb-8 font-heading text-headline-sm font-bold text-foreground">Recently Viewed</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4">
        {items.map((item) => (
          <Link key={item._id} href={`/products/${item.slug}`} className="group">
            <div className="relative mb-3 aspect-3/4 overflow-hidden bg-muted">
              {item.image && (
                <Image
                  src={item.image}
                  alt={item.name}
                  fill
                  loading="eager"
                  className="object-cover transition-opacity group-hover:opacity-80"
                  sizes="(min-width: 768px) 25vw, 50vw"
                />
              )}
            </div>
            <p className="text-[13px] text-foreground">{item.name}</p>
            <p className="text-[13px] text-muted-foreground">{formatPrice(item.discountPrice ?? item.price)}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}
