import { apiClient } from "./client";
import type { RelatedProduct } from "@/types/product";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface WishlistItem {
  product: RelatedProduct & { isActive: boolean; sizes: { size: string; stock: number }[] };
  addedAt: string;
}

export async function getWishlist(): Promise<WishlistItem[]> {
  const res = await apiClient.get<ApiEnvelope<WishlistItem[]>>("/wishlist");
  return res.data.data;
}

export async function addToWishlist(productId: string): Promise<WishlistItem[]> {
  const res = await apiClient.post<ApiEnvelope<WishlistItem[]>>(`/wishlist/${productId}`);
  return res.data.data;
}

export async function removeFromWishlist(productId: string): Promise<WishlistItem[]> {
  const res = await apiClient.delete<ApiEnvelope<WishlistItem[]>>(`/wishlist/${productId}`);
  return res.data.data;
}
