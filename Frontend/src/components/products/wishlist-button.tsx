"use client";

import { Link } from "@/i18n/navigation";
import { Heart } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCurrentUser } from "@/hooks/use-current-user";
import { getWishlist, addToWishlist, removeFromWishlist } from "@/lib/api/wishlist";
import { apiErrorMessage } from "@/lib/api-error";

export function WishlistButton({ productId }: { productId: string }) {
  const { data: user } = useCurrentUser();
  const queryClient = useQueryClient();

  const { data: wishlist } = useQuery({
    queryKey: ["wishlist"],
    queryFn: getWishlist,
    enabled: !!user,
  });

  const isWishlisted = wishlist?.some((item) => item.product._id === productId) ?? false;

  const toggleMutation = useMutation({
    mutationFn: () => (isWishlisted ? removeFromWishlist(productId) : addToWishlist(productId)),
    onSuccess: (updated) => {
      queryClient.setQueryData(["wishlist"], updated);
      toast.success(isWishlisted ? "Removed from wishlist" : "Added to wishlist");
    },
    onError: (err) => toast.error(apiErrorMessage(err, "Something went wrong")),
  });

  if (!user) {
    return (
      <Link
        href="/login"
        aria-label="Sign in to save to wishlist"
        className="ui-action ui-action--icon ui-action--ghost flex size-11 shrink-0 items-center justify-center border border-border text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
      >
        <Heart className="size-5" strokeWidth={1.5} />
      </Link>
    );
  }

  return (
    <button
      type="button"
      onClick={() => toggleMutation.mutate()}
      disabled={toggleMutation.isPending}
      aria-label={isWishlisted ? "Remove from wishlist" : "Add to wishlist"}
      aria-pressed={isWishlisted}
      className="ui-action ui-action--icon ui-action--ghost flex size-11 shrink-0 items-center justify-center border border-border text-foreground transition-colors hover:border-foreground disabled:opacity-50"
    >
      <Heart className={`size-5 ${isWishlisted ? "fill-foreground" : "fill-none"}`} strokeWidth={1.5} />
    </button>
  );
}
