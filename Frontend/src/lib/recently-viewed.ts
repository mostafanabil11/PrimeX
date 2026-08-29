"use client";

const STORAGE_KEY = "valiant-recently-viewed";
const MAX_ITEMS = 8;

export interface RecentlyViewedEntry {
  _id: string;
  name: string;
  slug: string;
  image: string | null;
  price: number;
  discountPrice: number | null;
}

// Deliberately client-only storage, not synced to an account — this is a
// browsing-session convenience, not data worth a backend round trip or a
// cross-device guarantee.
export function getRecentlyViewed(): RecentlyViewedEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as RecentlyViewedEntry[]) : [];
  } catch {
    return [];
  }
}

export function recordRecentlyViewed(entry: RecentlyViewedEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentlyViewed().filter((e) => e._id !== entry._id);
    const updated = [entry, ...existing].slice(0, MAX_ITEMS);
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // Storage full or disabled — recently-viewed is a nicety, not worth
    // surfacing an error over.
  }
}
