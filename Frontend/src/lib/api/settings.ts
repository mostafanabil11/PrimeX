import { apiClient } from "./client";
import { serverFetchOptional } from "./server-fetch";
import type { StoreSettings } from "@/types/settings";

interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data: T;
}

const DEFAULT_STORE_SETTINGS: StoreSettings = {
  currency: "USD",
  taxRateBasisPoints: 0,
  freeShippingThresholdMinorUnits: 0,
  flatShippingRateMinorUnits: 0,
};

// Server-side only (used from Server Components like SiteHeader) — settings
// change rarely, so this is revalidated hourly rather than fetched on every
// request.
//
// Falls back to defaults rather than throwing. SiteHeader renders on the root
// layout, so every single page depends on this call — letting it fail would
// take down the whole site, including the 404 page, whenever the API is
// briefly unreachable.
export async function getStoreSettings(): Promise<StoreSettings> {
  const body = await serverFetchOptional<ApiEnvelope<StoreSettings> | null>(
    '/settings',
    { revalidate: 3600 },
    null,
  );
  return body?.data ?? DEFAULT_STORE_SETTINGS;
}

// Client-side (Client Components, e.g. the checkout page previewing shipping
// cost before the order is actually placed).
export async function getStoreSettingsClient(): Promise<StoreSettings> {
  const res = await apiClient.get<ApiEnvelope<StoreSettings>>("/settings");
  return res.data.data;
}

// --- Admin ---

export async function updateStoreSettings(data: Partial<StoreSettings>): Promise<StoreSettings> {
  const res = await apiClient.patch<ApiEnvelope<StoreSettings>>("/settings", data);
  return res.data.data;
}
