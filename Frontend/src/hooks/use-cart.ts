"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useCurrentUser } from "./use-current-user";
import { useCartStore } from "@/store/cart";
import {
  getServerCart,
  addServerCartItem,
  updateServerCartItem,
  removeServerCartItem,
  validateCart,
} from "@/lib/api/cart";
import type { ResolvedCart } from "@/types/cart";
import type { ProductSize } from "@/types/product";

const EMPTY_CART: ResolvedCart = { items: [], subtotal: 0, hasChanges: false };

// Two cart sources behind one interface: signed-in users read/write the
// real server cart (task 2) directly, so it's what checkout will also see.
// Signed-out visitors keep using the local zustand store as a holding pen —
// still re-priced through the same public /cart/validate endpoint the
// server cart uses internally, so a guest never sees a price the server
// wouldn't also charge. The local store gets merged into the server cart
// on login (see the login page's onSuccess).
export function useCart() {
  const { data: user } = useCurrentUser();
  const isAuthenticated = !!user;
  const queryClient = useQueryClient();

  const localItems = useCartStore((s) => s.items);
  const localAddItem = useCartStore((s) => s.addItem);
  const localUpdateQuantity = useCartStore((s) => s.updateQuantity);
  const localRemoveItem = useCartStore((s) => s.removeItem);

  const serverCartQuery = useQuery({
    queryKey: ["cart", "server"],
    queryFn: getServerCart,
    enabled: isAuthenticated,
  });

  const localValidationKey = localItems.map((i) => `${i.productId}:${i.size}:${i.quantity}`).join("|");
  const localValidateQuery = useQuery({
    queryKey: ["cart", "local-validate", localValidationKey],
    queryFn: () => validateCart(localItems.map((i) => ({ productId: i.productId, size: i.size, quantity: i.quantity }))),
    enabled: !isAuthenticated && localItems.length > 0,
  });

  const cart: ResolvedCart = isAuthenticated
    ? (serverCartQuery.data ?? EMPTY_CART)
    : localItems.length > 0
      ? (localValidateQuery.data ?? EMPTY_CART)
      : EMPTY_CART;

  const isLoading = isAuthenticated ? serverCartQuery.isLoading : localValidateQuery.isFetching;

  const addItemMutation = useMutation({
    mutationFn: (vars: { productId: string; size: ProductSize; quantity: number }) =>
      addServerCartItem(vars.productId, vars.size, vars.quantity),
    onSuccess: (data) => queryClient.setQueryData(["cart", "server"], data),
  });

  const updateItemMutation = useMutation({
    mutationFn: (vars: { productId: string; size: ProductSize; quantity: number }) =>
      updateServerCartItem(vars.productId, vars.size, vars.quantity),
    onSuccess: (data) => queryClient.setQueryData(["cart", "server"], data),
  });

  const removeItemMutation = useMutation({
    mutationFn: (vars: { productId: string; size: ProductSize }) => removeServerCartItem(vars.productId, vars.size),
    onSuccess: (data) => queryClient.setQueryData(["cart", "server"], data),
  });

  function addItem(
    productId: string,
    size: ProductSize,
    quantity: number,
    display: { slug: string; name: string; color: string; price: number; image: string },
  ) {
    if (isAuthenticated) {
      addItemMutation.mutate({ productId, size, quantity });
    } else {
      // price is stored only for instant optimistic display before the
      // guest logs in or visits the cart page — cart/checkout always
      // re-resolve through validateCart/getServerCart, never trust this.
      localAddItem({ productId, slug: display.slug, name: display.name, color: display.color, size, price: display.price, image: display.image }, quantity);
    }
  }

  function updateQuantity(productId: string, size: ProductSize, quantity: number) {
    if (isAuthenticated) {
      updateItemMutation.mutate({ productId, size, quantity });
    } else {
      localUpdateQuantity(productId, size, quantity);
    }
  }

  function removeItem(productId: string, size: ProductSize) {
    if (isAuthenticated) {
      removeItemMutation.mutate({ productId, size });
    } else {
      localRemoveItem(productId, size);
    }
  }

  const itemCount = cart.items.reduce((sum, i) => sum + i.quantity, 0);

  return {
    cart,
    isLoading,
    isAuthenticated,
    itemCount,
    addItem,
    updateQuantity,
    removeItem,
  };
}
