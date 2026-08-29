import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type OfferDocument = HydratedDocument<Offer>;

// percentage — whole points off the plan price (30 = 30%)
// fixed      — minor units off (50000 = EGP 500)
export const OFFER_TYPES = ['percentage', 'fixed'] as const;
export type OfferType = (typeof OFFER_TYPES)[number];

/**
 * An automatic price reduction the gym runs on part of the pricing grid.
 *
 * Distinct from a Coupon, and deliberately not built on top of one. A coupon
 * is a code a member types, tied to a redeemer and a usage count; an offer is
 * a public promotion that everybody sees on the pricing page whether or not
 * they know it exists. Memberships take offers only — the two are never
 * combined, so a price can never be discounted twice.
 *
 * The point of targeting tiers and durations rather than individual plans is
 * that the pricing grid is two axes. "30% off annual" is one record pointing
 * at a duration, and every tier underneath inherits it; expressed as a list
 * of plans it would be four rows to create and four to remember to remove.
 */
@Schema({ timestamps: true })
export class Offer {
  // Shown on the pricing card as the badge. Gyms name their promotions
  // ("Ramadan Offer") and a bare "30% OFF" throws that away.
  @Prop({ required: true, trim: true })
  name: string = '';

  @Prop({ required: true, enum: OFFER_TYPES, default: 'percentage' })
  type: OfferType = 'percentage';

  @Prop({ required: true, min: 0 })
  value: number = 0;

  // Both empty means the offer applies to the entire grid. A non-empty list is
  // an allow-list, matching the convention Coupon.categories already sets.
  //
  // Tiers are matched by name rather than by id because Plan.tier is free
  // text — there is no tier collection to reference.
  @Prop({ type: [String], default: [] })
  tiers: string[] = [];

  // Term lengths in months: [12] is "annual only", [3, 6] is both mid terms.
  @Prop({ type: [Number], default: [] })
  durationMonths: number[] = [];

  // Null on either end means open-ended. An offer with no end date runs until
  // somebody switches it off, which is a legitimate thing to want for an
  // always-on introductory price.
  @Prop({ type: Date, default: null })
  startsAt: Date | null = null;

  @Prop({ type: Date, default: null })
  endsAt: Date | null = null;

  // The kill switch, separate from the date window. Ending a promotion early
  // should not mean editing its dates to something untrue — the record is
  // also the history of what the gym ran and when.
  @Prop({ default: true })
  isActive: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OfferSchema = SchemaFactory.createForClass(Offer);

// Every price lookup asks the same question: which offers are live right now.
OfferSchema.index({ isActive: 1, startsAt: 1, endsAt: 1 });
