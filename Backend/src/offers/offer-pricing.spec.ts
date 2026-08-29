import {
  resolveOfferPricing,
  offerMatchesPlan,
  planTermInMonths,
  isOfferLive,
  PricedPlan,
} from './offer-pricing';
import { Offer } from './schemas/offer.schema';

const NOW = new Date('2026-08-25T12:00:00.000Z');

function offer(over: Partial<Offer> = {}): Offer {
  return {
    name: 'Test Offer',
    type: 'percentage',
    value: 30,
    tiers: [],
    durationMonths: [],
    startsAt: null,
    endsAt: null,
    isActive: true,
    ...over,
  } as Offer;
}

function plan(over: Partial<PricedPlan> = {}): PricedPlan {
  return {
    tier: 'Elite',
    durationValue: 12,
    durationUnit: 'month',
    priceMinorUnits: 3960000,
    discountPriceMinorUnits: null,
    ...over,
  };
}

describe('planTermInMonths', () => {
  it('reads a month term directly', () => {
    expect(planTermInMonths({ durationValue: 3, durationUnit: 'month' })).toBe(3);
  });

  it('converts years to months, so a 1-year plan matches an offer on 12', () => {
    expect(planTermInMonths({ durationValue: 1, durationUnit: 'year' })).toBe(12);
  });

  // A day pass has no month length. Returning 0 would let it match an offer
  // someone configured for durationMonths: [0].
  it('returns null for day and week terms rather than zero', () => {
    expect(planTermInMonths({ durationValue: 1, durationUnit: 'day' })).toBeNull();
    expect(planTermInMonths({ durationValue: 2, durationUnit: 'week' })).toBeNull();
  });
});

describe('isOfferLive', () => {
  it('rejects a switched-off offer even inside its window', () => {
    expect(isOfferLive(offer({ isActive: false }), NOW)).toBe(false);
  });

  it('rejects an offer that has not started', () => {
    expect(isOfferLive(offer({ startsAt: new Date('2026-09-01') }), NOW)).toBe(false);
  });

  // The reason end dates exist: nobody remembers to switch a promo off.
  it('rejects an offer that has expired', () => {
    expect(isOfferLive(offer({ endsAt: new Date('2026-08-01') }), NOW)).toBe(false);
  });

  it('accepts an open-ended offer', () => {
    expect(isOfferLive(offer(), NOW)).toBe(true);
  });
});

describe('offerMatchesPlan', () => {
  it('applies to the whole grid when both filters are empty', () => {
    expect(offerMatchesPlan(offer(), plan())).toBe(true);
  });

  // The headline case: one record, every tier underneath inherits it.
  it('matches every tier when targeting a duration alone', () => {
    const annualOffer = offer({ durationMonths: [12] });
    expect(offerMatchesPlan(annualOffer, plan({ tier: 'Starter' }))).toBe(true);
    expect(offerMatchesPlan(annualOffer, plan({ tier: 'Elite' }))).toBe(true);
  });

  it('excludes other durations when targeting annual', () => {
    expect(offerMatchesPlan(offer({ durationMonths: [12] }), plan({ durationValue: 3 }))).toBe(
      false
    );
  });

  it('matches every duration when targeting a tier alone', () => {
    const eliteOffer = offer({ tiers: ['Elite'] });
    expect(offerMatchesPlan(eliteOffer, plan({ durationValue: 1 }))).toBe(true);
    expect(offerMatchesPlan(eliteOffer, plan({ durationValue: 12 }))).toBe(true);
  });

  it('narrows to a single cell when both axes are set', () => {
    const cell = offer({ tiers: ['Elite'], durationMonths: [12] });
    expect(offerMatchesPlan(cell, plan())).toBe(true);
    expect(offerMatchesPlan(cell, plan({ tier: 'Master' }))).toBe(false);
    expect(offerMatchesPlan(cell, plan({ durationValue: 6 }))).toBe(false);
  });

  // Tier is free text an admin types, so "elite" and "Elite" are the same tier.
  it('matches tier names case- and whitespace-insensitively', () => {
    expect(offerMatchesPlan(offer({ tiers: ['  elite '] }), plan({ tier: 'Elite' }))).toBe(true);
  });

  it('does not match a tierless plan against a tier-targeted offer', () => {
    expect(offerMatchesPlan(offer({ tiers: ['Elite'] }), plan({ tier: null }))).toBe(false);
  });
});

describe('resolveOfferPricing', () => {
  it('leaves the price alone when nothing applies', () => {
    const result = resolveOfferPricing(plan(), [], NOW);

    expect(result.effectivePriceMinorUnits).toBe(3960000);
    expect(result.savingMinorUnits).toBe(0);
    expect(result.appliedOffer).toBeNull();
  });

  it('takes a percentage off and reports the badge name', () => {
    const result = resolveOfferPricing(
      plan({ priceMinorUnits: 1000000 }),
      [offer({ name: 'Ramadan Offer', value: 30 })],
      NOW
    );

    expect(result.effectivePriceMinorUnits).toBe(700000);
    expect(result.savingPercent).toBe(30);
    expect(result.appliedOffer?.name).toBe('Ramadan Offer');
  });

  it('takes a fixed amount off', () => {
    const result = resolveOfferPricing(
      plan({ priceMinorUnits: 1000000 }),
      [offer({ type: 'fixed', value: 250000 })],
      NOW
    );

    expect(result.effectivePriceMinorUnits).toBe(750000);
  });

  // The rule that stops 30% + 20% quietly becoming 44%.
  it('never stacks overlapping offers — the single best one wins', () => {
    const result = resolveOfferPricing(
      plan({ priceMinorUnits: 1000000 }),
      [
        offer({ name: 'Annual', value: 30, durationMonths: [12] }),
        offer({ name: 'Elite', value: 20, tiers: ['Elite'] }),
      ],
      NOW
    );

    expect(result.effectivePriceMinorUnits).toBe(700000);
    expect(result.appliedOffer?.name).toBe('Annual');
  });

  it('picks the better offer regardless of the order they arrive in', () => {
    const offers = [
      offer({ name: 'Small', value: 10 }),
      offer({ name: 'Big', value: 40 }),
      offer({ name: 'Medium', value: 25 }),
    ];

    expect(
      resolveOfferPricing(plan({ priceMinorUnits: 1000000 }), offers, NOW).appliedOffer?.name
    ).toBe('Big');
  });

  it('ignores offers that are expired, unstarted or switched off', () => {
    const result = resolveOfferPricing(
      plan({ priceMinorUnits: 1000000 }),
      [
        offer({ name: 'Expired', value: 50, endsAt: new Date('2026-08-01') }),
        offer({ name: 'Future', value: 50, startsAt: new Date('2026-09-01') }),
        offer({ name: 'Paused', value: 50, isActive: false }),
      ],
      NOW
    );

    expect(result.effectivePriceMinorUnits).toBe(1000000);
    expect(result.appliedOffer).toBeNull();
  });

  // A hand-set sale price competes with the offers rather than becoming the
  // baseline they are computed from — otherwise the two compound.
  it('does not compound a plan sale price with an offer', () => {
    const result = resolveOfferPricing(
      plan({ priceMinorUnits: 1000000, discountPriceMinorUnits: 900000 }),
      [offer({ value: 30 })],
      NOW
    );

    // 30% of the list price, not 30% off the already-reduced 900000.
    expect(result.effectivePriceMinorUnits).toBe(700000);
  });

  it('keeps a plan sale price when it beats every live offer', () => {
    const result = resolveOfferPricing(
      plan({ priceMinorUnits: 1000000, discountPriceMinorUnits: 500000 }),
      [offer({ value: 30 })],
      NOW
    );

    expect(result.effectivePriceMinorUnits).toBe(500000);
    // The plan's own price won, so there is no offer badge to show.
    expect(result.appliedOffer).toBeNull();
  });

  it('never returns a negative price when a fixed offer exceeds the plan price', () => {
    const result = resolveOfferPricing(
      plan({ priceMinorUnits: 100000 }),
      [offer({ type: 'fixed', value: 500000 })],
      NOW
    );

    expect(result.effectivePriceMinorUnits).toBe(0);
    expect(result.savingPercent).toBe(100);
  });

  it('rounds a percentage to whole minor units', () => {
    // 33% of 999 piastres is 329.67 — money has to land on an integer.
    const result = resolveOfferPricing(plan({ priceMinorUnits: 999 }), [offer({ value: 33 })], NOW);

    expect(Number.isInteger(result.effectivePriceMinorUnits)).toBe(true);
    expect(result.effectivePriceMinorUnits).toBe(669);
  });

  it('does not divide by zero on a free plan', () => {
    const result = resolveOfferPricing(plan({ priceMinorUnits: 0 }), [offer({ value: 30 })], NOW);

    expect(result.savingPercent).toBe(0);
    expect(result.effectivePriceMinorUnits).toBe(0);
  });
});
