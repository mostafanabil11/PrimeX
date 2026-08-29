import { apiClient } from "./client";
import type { Review, ReviewStatus } from "@/types/review";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

export async function getReviewsForClassType(classTypeId: string): Promise<Review[]> {
  const res = await apiClient.get<ApiEnvelope<Review[]>>(`/reviews/class/${classTypeId}`);
  return res.data.data;
}

export async function createReview(data: { classTypeId: string; rating: number; title: string; body: string }): Promise<Review> {
  const res = await apiClient.post<ApiEnvelope<Review>>("/reviews", data);
  return res.data.data;
}

// --- Admin ---

export async function getReviewsForModeration(status?: ReviewStatus): Promise<Review[]> {
  const res = await apiClient.get<ApiEnvelope<Review[]>>("/reviews/admin", { params: status ? { status } : {} });
  return res.data.data;
}

export async function moderateReview(id: string, status: "approved" | "rejected"): Promise<Review> {
  const res = await apiClient.patch<ApiEnvelope<Review>>(`/reviews/${id}/moderate`, { status });
  return res.data.data;
}

export async function deleteReview(id: string): Promise<void> {
  await apiClient.delete(`/reviews/${id}`);
}
