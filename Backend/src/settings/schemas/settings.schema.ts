import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type SettingsDocument = HydratedDocument<Settings>;

// Singleton — exactly one document ever exists in this collection (see
// SettingsService.getSettings, which upserts against an empty filter).
//
// Scope is deliberately gym-wide: anything that varies per location — address,
// opening hours, facilities, phone — belongs on Branch instead. What lives
// here is either brand-level (name, socials) or policy the whole business
// applies uniformly (freeze allowance, booking cutoff, VAT).
@Schema({ timestamps: true })
export class Settings {
  // --- Brand ---

  @Prop({ default: 'PrimeX' })
  brandName: string = 'PrimeX';

  @Prop({ default: 'Commit To Be Fit' })
  tagline: string = 'Commit To Be Fit';

  @Prop({ type: String, default: null })
  supportEmail: string | null = null;

  @Prop({ type: String, default: null })
  supportPhone: string | null = null;

  // Egypt runs on WhatsApp. Stored separately from supportPhone because the
  // two are often different numbers, and the site links them differently.
  @Prop({ type: String, default: null })
  whatsappNumber: string | null = null;

  @Prop({ type: String, default: null })
  instagramUrl: string | null = null;

  @Prop({ type: String, default: null })
  facebookUrl: string | null = null;

  @Prop({ type: String, default: null })
  tiktokUrl: string | null = null;

  @Prop({ type: String, default: null })
  youtubeUrl: string | null = null;

  // --- Money ---

  @Prop({ default: 'EGP' })
  currency: string = 'EGP';

  // Integer basis points (1400 = 14.00%), not a float — same reasoning as
  // storing money in minor units: avoids rounding drift once this is
  // multiplied against invoice subtotals.
  @Prop({ default: 0, min: 0, max: 10000 })
  taxRateBasisPoints: number = 0;

  // Charged once when a member first joins, on top of the plan price. Set to
  // 0 to run a "no joining fee" promotion without touching any plan.
  @Prop({ default: 0, min: 0 })
  joiningFeeMinorUnits: number = 0;

  // Whether someone returning after their membership lapsed pays the joining
  // fee again, and how long the grace period is. Policy, not code — the renew
  // flow reads both rather than hardcoding a rule.
  @Prop({ default: true })
  chargeJoiningFeeOnLapsedRenewal: boolean = true;

  @Prop({ default: 30, min: 0 })
  lapsedRenewalGraceDays: number = 30;

  // --- Membership policy ---

  // Ceiling on how many days a member may freeze per cycle. A plan may allow
  // fewer; it may never allow more than this.
  @Prop({ default: 30, min: 0 })
  maxFreezeDaysPerCycle: number = 30;

  // Notice a member must give before a cancellation takes effect.
  @Prop({ default: 30, min: 0 })
  cancellationNoticeDays: number = 30;

  // --- Booking policy ---

  // How far ahead the timetable opens for booking.
  @Prop({ default: 14, min: 1 })
  bookingHorizonDays: number = 14;

  // Booking closes this long before a class starts, so coaches know their
  // numbers with enough time to set the room up.
  @Prop({ default: 1, min: 0 })
  bookingCutoffHours: number = 1;

  // Cancel earlier than this and the class credit comes back; later and it
  // does not. The whole point of a cancellation window is that late drop-outs
  // cost the member something, because the seat can no longer be resold.
  @Prop({ default: 4, min: 0 })
  freeCancellationWindowHours: number = 4;

  // Consecutive no-shows before booking is suspended. 0 disables the penalty.
  @Prop({ default: 3, min: 0 })
  noShowLimit: number = 3;

  @Prop({ default: 7, min: 0 })
  noShowSuspensionDays: number = 7;

  // Stops one member holding a week of peak slots they may not attend.
  @Prop({ default: 10, min: 1 })
  maxConcurrentBookings: number = 10;

  // --- Retail (dormant) ---
  //
  // Read only by the switched-off storefront. Left in place so turning
  // SHOP_ENABLED back on does not need a migration.

  @Prop({ default: 30000, min: 0 })
  freeShippingThresholdMinorUnits: number = 30000;

  @Prop({ default: 5000, min: 0 })
  flatShippingRateMinorUnits: number = 5000;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SettingsSchema = SchemaFactory.createForClass(Settings);
