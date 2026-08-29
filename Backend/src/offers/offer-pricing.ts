import { DurationUnit } from '@/plans/schemas/plan.schema';
import { Offer } from './schemas/offer.schema';

/**
 * The subset of a plan that pricing depends on. Narrowed to an interface
 * rather than taking a PlanDocument so this file stays free of Mongoose and
 * can be called with a lean object, a hydrated document, or a literal in a
 * test.
 */
export interface PricedPlan {
  tier?: string | null;
  durationValue: number;
  durationUnit: DurationUnit;
  priceMinorUnits: number;
  discountPriceMinorUnits?: number | null;
}

export interface OfferPricing {
  /** The plan's undiscounted list price, for striking through. */
  listPriceMinorUnits: number;
  /** What the member actually pays. Never above the list price. */
  effectivePriceMinorUnits: number;
  /** listPrice - effectivePrice. Zero when nothing applied. */
  savingMinorUnits: number;
  /** Whole points off, rounded, purely for a "30% off" badge. */
  savingPercent: number;
  /** The offer that won, or null when the price is the plan's own. */
  appliedOffer: { id: string | null; name: string } | null;
}

/**
 * A plan's term expressed in whole months, or null if it has no month-based
 * term at all.
 *
 * Null rather than zero for day and week terms: a day pass genuinely has no
 * month length, and returning 0 would make it match an offer configured for
 * `durationMonths: [0]`, which is a value somebody could plausibly type.
 */
export function planTermInMonths(plan: Pick<PricedPlan, 'durationValue' | 'durationUnit'>) {
  switch (plan.durationUnit) {
    case 'month':
      return plan.durationValue;
    case 'year':
      return plan.durationValue * 12;
    default:
      return null;
  }
}

/** Whether an offer is switched on and inside its date window. */
export function isOfferLive(offer: Pick<Offer, 'isActive' | 'startsAt' | 'endsAt'>, now: Date) {
  if (!offer.isActive) return false;
  if (offer.startsAt && now < offer.startsAt) return false;
  if (offer.endsAt && now > offer.endsAt) return false;
  return true;
}

/** Whether an offer's tier and duration filters both match this plan. */
export function offerMatchesPlan(
  offer: Pick<Offer, 'tiers' | 'durationMonths'>,
  plan: PricedPlan
): boolean {
  // An empty list means "no restriction on this axis", so both empty is a
  // grid-wide sale. This mirrors Coupon.categories.
  if (offer.tiers.length > 0) {
    if (!plan.tier) return false;
    const wanted = offer.tiers.map(t => t.trim().toLowerCase());
    if (!wanted.includes(plan.tier.trim().toLowerCase())) return false;
  }

  if (offer.durationMonths.length > 0) {
    const months = planTermInMonths(plan);
    if (months === null || !offer.durationMonths.includes(months)) return false;
  }

  return true;
}

/** What one offer would charge for this plan, floored at zero. */
function priceUnderOffer(offer: Pick<Offer, 'type' | 'value'>, listPrice: number): number {
  const discount =
    offer.type === 'percentage' ? Math.round((listPrice * offer.value) / 100) : offer.value;

  return Math.max(0, listPrice - discount);
}

/**
 * Works out what a plan actually costs once the gym's live offers are taken
 * into account.
 *
 * Two rules decide the outcome, and both exist to stop discounts compounding:
 *
 *   1. Offers never stack. Where several match — say 30% off annual and 20%
 *      off Elite, which both hit Elite annual — the single best one wins
 *      rather than being applied in sequence. Sequencing them would give 44%
 *      off, which is not what either offer says and not what anyone intended.
 *
 *   2. A plan's own discountPriceMinorUnits is treated as just another
 *      candidate, not as a new baseline. Every candidate is computed from the
 *      list price and the lowest one is taken, so a hand-set sale price and a
 *      seasonal offer can never be charged on top of one another.
 *
 * Pure and side-effect free: the caller passes in the offers and the clock.
 */
export function resolveOfferPricing(
  plan: PricedPlan,
  offers: Offer[],
  now: Date = new Date()
): OfferPricing {
  const listPrice = plan.priceMinorUnits;

  let bestPrice = listPrice;
  let appliedOffer: OfferPricing['appliedOffer'] = null;

  // The plan's own sale price, if set, competes on equal terms with the
  // offers rather than replacing the baseline they are computed from.
  if (
    plan.discountPriceMinorUnits !== null &&
    plan.discountPriceMinorUnits !== undefined &&
    plan.discountPriceMinorUnits < bestPrice
  ) {
    bestPrice = plan.discountPriceMinorUnits;
  }

  for (const offer of offers) {
    if (!isOfferLive(offer, now)) continue;
    if (!offerMatchesPlan(offer, plan)) continue;

    const candidate = priceUnderOffer(offer, listPrice);
    if (candidate < bestPrice) {
      bestPrice = candidate;
      appliedOffer = {
        id: (offer as { _id?: { toString(): string } })._id?.toString() ?? null,
        name: offer.name,
      };
    }
  }

  const saving = listPrice - bestPrice;

  return {
    listPriceMinorUnits: listPrice,
    effectivePriceMinorUnits: bestPrice,
    savingMinorUnits: saving,
    savingPercent: listPrice > 0 ? Math.round((saving / listPrice) * 100) : 0,
    appliedOffer,
  };
}
