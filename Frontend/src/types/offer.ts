export type OfferType = "percentage" | "fixed";

/**
 * An automatic discount the gym runs on part of the pricing grid.
 *
 * Targets the two axes of that grid rather than individual plans: an offer
 * with `durationMonths: [12]` and no tiers is "30% off annual", and every
 * tier inherits it. An empty list on an axis means no restriction there, so
 * both empty is a sale across everything.
 *
 * Admin-only. The public pages never see these — they read prices that
 * already have offers applied.
 */
export interface Offer {
  _id: string;
  name: string;
  type: OfferType;
  // percentage: whole points (30 = 30%). fixed: minor units off.
  value: number;
  tiers: string[];
  durationMonths: number[];
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface OfferInput {
  name: string;
  type: OfferType;
  value: number;
  tiers: string[];
  durationMonths: number[];
  startsAt: string | null;
  endsAt: string | null;
  isActive: boolean;
}

/**
 * Whether an offer is reducing prices at this moment.
 *
 * Presentation only — the server decides what anybody is charged. This exists
 * so the admin list can distinguish "live" from "scheduled" from "finished",
 * which the isActive flag alone cannot say.
 */
export function offerStatus(offer: Offer, now: Date = new Date()) {
  if (!offer.isActive) return "paused" as const;
  if (offer.startsAt && now < new Date(offer.startsAt)) return "scheduled" as const;
  if (offer.endsAt && now > new Date(offer.endsAt)) return "finished" as const;
  return "live" as const;
}
