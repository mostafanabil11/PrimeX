"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getWishlist, removeFromWishlist } from "@/lib/api/wishlist";
import { formatPrice } from "@/lib/format";
import { requireShop } from "@/lib/features";

export default function WishlistPage() {
  requireShop();

  const router = useRouter();
  const queryClient = useQueryClient();
  const { data: user, isLoading: userLoading } = useCurrentUser();

  useEffect(() => {
    if (!userLoading && !user) {
      router.replace("/login?next=/account/wishlist");
    }
  }, [userLoading, user, router]);

  const { data: items, isLoading } = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlist,
    enabled: !!user,
  });

  const removeMutation = useMutation({
    mutationFn: (productId: string) => removeFromWishlist(productId),
    onSuccess: (updated) => {
      queryClient.setQueryData(["wishlist"], updated);
      toast.success("Removed from wishlist");
    },
  });

  if (userLoading || !user) {
    return null;
  }

  return (
    <div className="mx-auto w-full max-w-(--spacing-container-max) px-margin-mobile py-stack-xl md:px-margin-desktop">
      <h1 className="mb-10 font-heading text-headline-sm font-bold text-foreground md:text-headline-md">
        Wishlist
      </h1>

      {isLoading ? (
        <div className="h-64 animate-pulse bg-muted" />
      ) : !items || items.length === 0 ? (
        <div className="flex flex-col items-center py-12 text-center">
          <p className="mb-6 text-body-md text-muted-foreground">Nothing saved yet.</p>
          <Link
            href="/"
            className="bg-primary px-8 py-4 text-button font-medium tracking-[0.05em] text-primary-foreground uppercase transition-colors hover:bg-primary/90"
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3 md:grid-cols-4">
          {items.map(({ product }) => (
            <div key={product._id} className="group relative">
              <button
                type="button"
                onClick={() => removeMutation.mutate(product._id)}
                aria-label="Remove from wishlist"
                className="absolute top-2 right-2 z-10 flex size-8 items-center justify-center bg-background/90 text-foreground transition-colors hover:text-destructive"
              >
                <X className="size-4" strokeWidth={1.5} />
              </button>
              <Link href={`/products/${product.slug}`}>
                <div className="relative mb-3 aspect-3/4 overflow-hidden bg-muted">
                  {product.images[0] && (
                    <Image
                      src={product.images[0]}
                      alt={product.name}
                      fill
                      className="object-cover transition-opacity group-hover:opacity-80"
                      sizes="(min-width: 768px) 25vw, 50vw"
                    />
                  )}
                </div>
                <p className="text-[13px] text-foreground">{product.name}</p>
                <p className="text-[13px] text-muted-foreground">
                  {formatPrice(product.discountPrice ?? product.price)}
                </p>
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
