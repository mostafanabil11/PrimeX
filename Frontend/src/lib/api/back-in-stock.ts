import { apiClient } from "./client";
import type { ProductSize } from "@/types/product";

export async function requestBackInStock(productId: string, size: ProductSize, email: string): Promise<void> {
  await apiClient.post(`/back-in-stock/${productId}`, { size, email });
}
