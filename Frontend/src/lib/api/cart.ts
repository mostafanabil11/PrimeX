import { apiClient } from "./client";
import type { ResolvedCart } from "@/types/cart";
import type { ProductSize } from "@/types/product";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export interface ValidateCartLine {
  productId: string;
  size: ProductSize;
  quantity: number;
}

// Public — usable before login, to re-price a guest's local cart the same
// way the authenticated endpoints below re-price the server cart.
export async function validateCart(items: ValidateCartLine[]): Promise<ResolvedCart> {
  const res = await apiClient.post<ApiEnvelope<ResolvedCart>>("/cart/validate", { items });
  return res.data.data;
}

export async function getServerCart(): Promise<ResolvedCart> {
  const res = await apiClient.get<ApiEnvelope<ResolvedCart>>("/cart");
  return res.data.data;
}

export async function addServerCartItem(
  productId: string,
  size: ProductSize,
  quantity: number,
): Promise<ResolvedCart> {
  const res = await apiClient.post<ApiEnvelope<ResolvedCart>>("/cart/items", { productId, size, quantity });
  return res.data.data;
}

export async function updateServerCartItem(
  productId: string,
  size: ProductSize,
  quantity: number,
): Promise<ResolvedCart> {
  const res = await apiClient.patch<ApiEnvelope<ResolvedCart>>(`/cart/items/${productId}/${size}`, { quantity });
  return res.data.data;
}

export async function removeServerCartItem(productId: string, size: ProductSize): Promise<ResolvedCart> {
  const res = await apiClient.delete<ApiEnvelope<ResolvedCart>>(`/cart/items/${productId}/${size}`);
  return res.data.data;
}

export async function clearServerCart(): Promise<void> {
  await apiClient.delete("/cart");
}
