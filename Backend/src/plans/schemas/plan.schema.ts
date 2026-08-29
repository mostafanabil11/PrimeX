import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type PlanDocument = HydratedDocument<Plan>;

export const DURATION_UNITS = ['day', 'week', 'month', 'year'] as const;
export type DurationUnit = (typeof DURATION_UNITS)[number];

// none      — gym floor only; booking a class is refused with an upgrade prompt
// credits   — N bookings per billing cycle, refunded on an in-window cancel
// unlimited — book anything, subject only to capacity
export const CLASS_ACCESS_MODES = ['none', 'credits', 'unlimited'] as const;
export type ClassAccessMode = (typeof CLASS_ACCESS_MODES)[number];

// single — the member's home branch only
// all    — every branch, the usual reason to upgrade at a multi-site gym
export const BRANCH_ACCESS_MODES = ['single', 'all'] as const;
export type BranchAccessMode = (typeof BRANCH_ACCESS_MODES)[number];

// What the member may train in.
//
// gym_or_fitness  — the weights floor OR the studio timetable, member picks one
// gym_plus_fitness — both, which is the whole reason the upper tiers exist
export const ACCESS_SCOPES = ['gym_or_fitness', 'gym_plus_fitness'] as const;
export type AccessScope = (typeof ACCESS_SCOPES)[number];

/**
 * A countable benefit shown on the pricing card — "10 Jacuzzi", "3 InBody".
 *
 * Deliberately a free-text label rather than an enum of known amenities. A
 * gym adds a cryotherapy room or a physio slot on a Tuesday and expects it on
 * the website that afternoon; an enum would make that a schema change and a
 * deploy. Nothing here drives behaviour, so there is nothing to validate
 * against — these are display-only, unlike guestPasses and freezeDaysAllowed,
 * which the booking and freeze paths actually enforce.
 */
@Schema({ _id: false })
export class PlanPerk {
  @Prop({ required: true, trim: true })
  label: string = '';

  @Prop({ required: true, min: 0 })
  value: number = 0;
}

export const PlanPerkSchema = SchemaFactory.createForClass(PlanPerk);

@Schema({ _id: false })
export class ClassAccess {
  @Prop({ required: true, enum: CLASS_ACCESS_MODES, default: 'none' })
  mode: ClassAccessMode = 'none';

  // Only meaningful when mode is 'credits'. Ignored otherwise rather than
  // validated away, so switching a plan to credits and back does not lose the
  // number an admin already chose.
  @Prop({ default: 0, min: 0 })
  creditsPerCycle: number = 0;
}

export const ClassAccessSchema = SchemaFactory.createForClass(ClassAccess);

@Schema({ timestamps: true })
export class Plan {
  @Prop({ required: true, trim: true })
  name: string = '';

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string = '';

  // Free text, not an enum: "Student", "Off-Peak", "Founding Member" are all
  // things a gym invents on a Tuesday, and an enum would need a deploy.
  @Prop({ type: String, default: null })
  tier: string | null = null;

  @Prop({ type: String, default: null })
  description: string | null = null;

  // The bullet list on the pricing card, in the order it should read.
  @Prop({ type: [String], default: [] })
  benefits: string[] = [];

  // --- Term ---

  @Prop({ required: true, min: 1 })
  durationValue: number = 1;

  @Prop({ required: true, enum: DURATION_UNITS, default: 'month' })
  durationUnit: DurationUnit = 'month';

  // --- Price ---
  //
  // Minor units (piastres — 1 EGP = 100), stored as integers so totals, VAT
  // and discounts never accumulate floating-point error. Converted to major
  // units only at the display edge.

  @Prop({ required: true, min: 0 })
  priceMinorUnits: number = 0;

  @Prop({ type: Number, default: null, min: 0 })
  discountPriceMinorUnits: number | null = null;

  // Overrides Settings.joiningFeeMinorUnits when set. null means "use the
  // gym-wide fee"; 0 explicitly means "this plan waives it", which is a
  // different statement and has to survive a round-trip.
  @Prop({ type: Number, default: null, min: 0 })
  joiningFeeMinorUnits: number | null = null;

  // --- What it grants ---

  @Prop({ type: ClassAccessSchema, default: () => ({}) })
  classAccess: ClassAccess = new ClassAccess();

  @Prop({ required: true, enum: BRANCH_ACCESS_MODES, default: 'single' })
  branchAccess: BranchAccessMode = 'single';

  @Prop({ required: true, enum: ACCESS_SCOPES, default: 'gym_or_fitness' })
  accessScope: AccessScope = 'gym_or_fitness';

  // How many visits the plan covers over its whole term, and how many days a
  // week that works out as. null on either means unlimited — the top tier
  // sells "come every day", which is an absence of a cap rather than a very
  // large one, and storing 9999 to mean that reads as a real number to
  // anyone who later sums these for reporting.
  //
  // Display-only today: the gym counts entries at the door, and this app has
  // no turnstile to enforce against. classAccess below is the thing that is
  // actually enforced, and it governs class bookings, not entries.
  @Prop({ type: Number, default: null, min: 0 })
  sessionsIncluded: number | null = null;

  @Prop({ type: Number, default: null, min: 0, max: 7 })
  daysPerWeek: number | null = null;

  // Capped by Settings.maxFreezeDaysPerCycle at the point of use — a plan may
  // allow fewer days than the gym-wide ceiling, never more.
  @Prop({ default: 0, min: 0 })
  freezeDaysAllowed: number = 0;

  @Prop({ default: 0, min: 0 })
  guestPasses: number = 0;

  // Countable extras — jacuzzi, sauna, InBody scans. See PlanPerk.
  @Prop({ type: [PlanPerkSchema], default: [] })
  perks: PlanPerk[] = [];

  // --- Listing ---

  @Prop({ default: 0 })
  sortOrder: number = 0;

  // The highlighted column on the pricing page. Not enforced as a singleton:
  // two featured plans is a design decision, not a data error.
  @Prop({ default: false })
  isFeatured: boolean = false;

  @Prop({ default: true })
  isActive: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const PlanSchema = SchemaFactory.createForClass(Plan);

// Backs both the public pricing page and the admin list.
PlanSchema.index({ isActive: 1, sortOrder: 1 });
