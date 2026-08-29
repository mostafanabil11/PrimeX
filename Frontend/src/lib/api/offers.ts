import { apiClient } from "./client";
import type { Offer, OfferInput } from "@/types/offer";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

function unwrap<T>(res: { data: ApiEnvelope<T> }): T {
  return res.data.data;
}

// Admin only, deliberately — there is no public offers endpoint. The pricing
// page reads prices from /plans that already have offers applied, so the
// browser never holds a second copy of the discount rules.

export async function getOffers(): Promise<Offer[]> {
  return unwrap(await apiClient.get<ApiEnvelope<Offer[]>>("/offers"));
}

export async function getOffer(id: string): Promise<Offer> {
  return unwrap(await apiClient.get<ApiEnvelope<Offer>>(`/offers/${id}`));
}

export async function createOffer(input: OfferInput): Promise<Offer> {
  return unwrap(await apiClient.post<ApiEnvelope<Offer>>("/offers", input));
}

export async function updateOffer(id: string, input: Partial<OfferInput>): Promise<Offer> {
  return unwrap(await apiClient.patch<ApiEnvelope<Offer>>(`/offers/${id}`, input));
}

export async function deleteOffer(id: string): Promise<Offer> {
  return unwrap(await apiClient.delete<ApiEnvelope<Offer>>(`/offers/${id}`));
}
