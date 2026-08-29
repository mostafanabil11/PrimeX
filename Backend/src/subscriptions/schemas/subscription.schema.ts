import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';
import { randomBytes } from 'crypto';
import {
  DURATION_UNITS,
  DurationUnit,
  CLASS_ACCESS_MODES,
  ClassAccessMode,
  BRANCH_ACCESS_MODES,
  BranchAccessMode,
} from '@/plans/schemas/plan.schema';

export type SubscriptionDocument = HydratedDocument<Subscription>;

// pending   — bought but not yet paid for, or paid in cash and awaiting the desk
// active    — the member can walk in and book
// frozen    — paused on request; endsAt has already been pushed out to match
// expired   — ran its term without being renewed
// cancelled — ended early, either by the member or by staff
export const SUBSCRIPTION_STATUSES = [
  'pending',
  'active',
  'frozen',
  'expired',
  'cancelled',
] as const;
export type SubscriptionStatus = (typeof SUBSCRIPTION_STATUSES)[number];

// website    — the member filled in the reservation form themselves
// front_desk — staff recorded it, for a walk-in who never used the site
//
// This is the whole of the source tracking, on purpose. Which *page* they came
// from was considered and rejected: the useful question is "is the website
// bringing people in", and one field answers it without turning the schema
// into an analytics product.
export const SUBSCRIPTION_ORIGINS = ['website', 'front_desk'] as const;
export type SubscriptionOrigin = (typeof SUBSCRIPTION_ORIGINS)[number];

// No O/0 and no I/1: this code is read aloud in a WhatsApp thread and typed
// back by whoever is at the desk. Same alphabet as scripts/set-admin-password.js,
// uppercase only so it is unambiguous in a chat where casing gets mangled.
const REFERENCE_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const REFERENCE_LENGTH = 6;

export function generateReferenceCode(): string {
  const bytes = randomBytes(REFERENCE_LENGTH);
  return Array.from(bytes, byte => REFERENCE_ALPHABET[byte % REFERENCE_ALPHABET.length]).join('');
}

// Written out rather than left implicit, because every other part of the
// system trusts this model and an impossible transition here is a member who
// can walk in when they should not, or cannot when they should.
//
// Notable: expired -> active is absent. Renewing does not resurrect a lapsed
// subscription, it creates a new one — otherwise the history of what someone
// actually paid for, and when, is silently rewritten.
export const LEGAL_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  pending: ['active', 'cancelled'],
  active: ['frozen', 'expired', 'cancelled'],
  frozen: ['active', 'expired', 'cancelled'],
  expired: [],
  cancelled: [],
};

export function canTransition(from: SubscriptionStatus, to: SubscriptionStatus): boolean {
  return LEGAL_TRANSITIONS[from].includes(to);
}

// A copy of the plan as it was on the day it was bought.
//
// Not a live reference: a price rise, a renamed tier or a withdrawn plan must
// never rewrite what an existing member agreed to. The `plan` id is kept
// alongside for "renew the same plan" and reporting, but nothing reads pricing
// or entitlements through it.
@Schema({ _id: false })
export class PlanSnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Plan', required: true })
  plan!: Types.ObjectId;

  @Prop({ required: true })
  name: string = '';

  @Prop({ required: true })
  slug: string = '';

  @Prop({ type: String, default: null })
  tier: string | null = null;

  @Prop({ required: true, min: 1 })
  durationValue: number = 1;

  @Prop({ required: true, enum: DURATION_UNITS })
  durationUnit: DurationUnit = 'month';

  @Prop({ required: true, min: 0 })
  priceMinorUnits: number = 0;

  @Prop({ required: true, enum: CLASS_ACCESS_MODES })
  classAccessMode: ClassAccessMode = 'none';

  @Prop({ default: 0, min: 0 })
  creditsPerCycle: number = 0;

  @Prop({ required: true, enum: BRANCH_ACCESS_MODES })
  branchAccess: BranchAccessMode = 'single';

  @Prop({ default: 0, min: 0 })
  freezeDaysAllowed: number = 0;

  @Prop({ default: 0, min: 0 })
  guestPasses: number = 0;
}

export const PlanSnapshotSchema = SchemaFactory.createForClass(PlanSnapshot);

// One entry per freeze, kept forever. Staff get asked "how many days have I
// used" and a running total alone cannot answer "used when, and who approved
// it" — which is the question that actually comes up in a dispute.
@Schema({ _id: true, timestamps: false })
export class FreezePeriod {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  from: Date = new Date();

  @Prop({ required: true })
  to: Date = new Date();

  @Prop({ required: true, min: 0 })
  days: number = 0;

  @Prop({ type: String, default: null })
  reason: string | null = null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  approvedBy: Types.ObjectId | null = null;

  @Prop({ required: true })
  createdAt: Date = new Date();
}

export const FreezePeriodSchema = SchemaFactory.createForClass(FreezePeriod);

// Class credits reset on a cycle rather than accruing. A month's unused
// classes do not roll over — that is what "eight classes a month" means, and
// letting them bank turns a capacity plan into a liability.
@Schema({ _id: false })
export class ClassCredits {
  @Prop({ default: 0, min: 0 })
  remaining: number = 0;

  @Prop({ type: Date, default: null })
  cycleStartsAt: Date | null = null;

  @Prop({ type: Date, default: null })
  cycleEndsAt: Date | null = null;
}

export const ClassCreditsSchema = SchemaFactory.createForClass(ClassCredits);

@Schema({ timestamps: true })
export class Subscription {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  member!: Types.ObjectId;

  @Prop({ type: PlanSnapshotSchema, required: true })
  planSnapshot!: PlanSnapshot;

  // Which branch this membership belongs to. Meaningful even on an all-access
  // plan: it is where they usually train, and what a single-branch plan
  // restricts them to.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branch!: Types.ObjectId;

  @Prop({ required: true, enum: SUBSCRIPTION_STATUSES, default: 'pending' })
  status: SubscriptionStatus = 'pending';

  // Set when the member chooses a start date, which may be in the future —
  // people join on the 28th to start on the 1st.
  @Prop({ required: true })
  startsAt: Date = new Date();

  @Prop({ required: true })
  endsAt: Date = new Date();

  @Prop({ type: ClassCreditsSchema, default: () => ({}) })
  classCredits: ClassCredits = new ClassCredits();

  @Prop({ type: [FreezePeriodSchema], default: [] })
  freezes: FreezePeriod[] = [];

  @Prop({ default: 0, min: 0 })
  freezeDaysUsed: number = 0;

  @Prop({ default: 0, min: 0 })
  guestPassesRemaining: number = 0;

  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Invoice' }], default: [] })
  invoices: Types.ObjectId[] = [];

  // The subscription this one renewed, so a member's history is a chain rather
  // than a pile of unrelated rows.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subscription', default: null })
  renewedFrom: Types.ObjectId | null = null;

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null = null;

  @Prop({ type: String, default: null })
  cancellationReason: string | null = null;

  // The membership agreement is a legal record, so the version accepted and
  // the moment of acceptance are stored rather than assumed.
  @Prop({ type: String, default: null })
  agreementVersion: string | null = null;

  @Prop({ type: Date, default: null })
  agreementAcceptedAt: Date | null = null;

  // Which reminders have already gone out, so the daily scheduler is idempotent
  // — a re-run, or two instances, cannot send the same warning twice.
  @Prop({ type: [Number], default: [] })
  expiryRemindersSent: number[] = [];

  @Prop({ default: false })
  lapsedNudgeSent: boolean = false;

  /**
   * A short code the member can read aloud in a WhatsApp thread.
   *
   * Not identity — `member` is, and a phone number is what staff actually
   * match on, since the member is messaging from it. This exists because
   * "my reference is K7M2QP" lands staff on the right record in one paste,
   * where "the Elite one, starting September" does not. invoiceNumber would
   * almost do the job but nobody dictates INV-20260827-0004 without a typo.
   *
   * Ambiguity-free alphabet: no O/0, no I/1. It gets spoken and re-typed.
   */
  @Prop({ type: String, default: null })
  referenceCode: string | null = null;

  /**
   * How this membership came to exist. Nullable with no default on purpose:
   * rows predating this field have a genuinely unknown origin, and defaulting
   * them to 'website' would put a number in the funnel report that nobody
   * measured.
   */
  @Prop({ type: String, default: null, enum: [...SUBSCRIPTION_ORIGINS, null] })
  origin: SubscriptionOrigin | null = null;

  /**
   * Set when staff recorded a membership that had already started — importing
   * someone who has been training for a month, typically.
   *
   * Read by activate(), which otherwise pulls a past start date forward to
   * today. That correction is right for a member who reserved online and paid
   * a week later; it is wrong for a backdated record, and activation arrives
   * through the invoice.paid event, so a method argument could never reach it.
   */
  @Prop({ default: false })
  backdated: boolean = false;

  createdAt?: Date;
  updatedAt?: Date;
}

export const SubscriptionSchema = SchemaFactory.createForClass(Subscription);

// "Does this member have an active membership" is the single most-asked
// question in the app — check-in, booking, and every page of the member area.
SubscriptionSchema.index({ member: 1, status: 1, endsAt: -1 });
// Backs the daily expiry sweep and the reminder pass.
SubscriptionSchema.index({ status: 1, endsAt: 1 });
// Backs the monthly credit-cycle roll.
SubscriptionSchema.index({ status: 1, 'classCredits.cycleEndsAt': 1 });
// Admin listing, filtered by branch.
SubscriptionSchema.index({ branch: 1, status: 1, endsAt: -1 });

// Staff pasting a code out of a WhatsApp thread. Partial for the same reason
// as googleId on the User schema: the field defaults to null, so a plain
// unique index would let exactly one subscription exist without a code.
SubscriptionSchema.index(
  { referenceCode: 1 },
  { unique: true, partialFilterExpression: { referenceCode: { $type: 'string' } } }
);

// Backs the funnel report: how many website reservations were created in a
// window, and how many of them ever activated.
SubscriptionSchema.index({ origin: 1, createdAt: -1 });
