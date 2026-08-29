import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';
import { WEEKDAYS, Weekday } from '@/branches/schemas/branch.schema';

export type RecurrenceRuleDocument = HydratedDocument<RecurrenceRule>;
export type ClassSessionDocument = HydratedDocument<ClassSession>;

/**
 * "Spin, Tuesdays at 18:00 at New Cairo, with Sarah, cap 24."
 *
 * The rule is the intent; ClassSession rows are the occurrences it generates.
 * Sessions are materialised rather than computed on the fly because a booking
 * has to attach to something concrete, and because real timetables need
 * one-off exceptions — a trainer swap, a Ramadan time shift, a cancelled
 * evening — that a pure rule cannot express.
 */
@Schema({ timestamps: true })
export class RecurrenceRule {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ClassType', required: true })
  classType!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branch!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trainer', default: null })
  trainer: Types.ObjectId | null = null;

  @Prop({ required: true, enum: WEEKDAYS })
  weekday!: Weekday;

  // Local wall-clock, "HH:mm". Stored this way and converted to an instant per
  // occurrence, because Cairo is UTC+2 in winter and UTC+3 in summer — a rule
  // holding a fixed instant would drift by an hour twice a year.
  @Prop({ required: true })
  startTime: string = '';

  @Prop({ required: true, min: 5, max: 300 })
  durationMinutes: number = 45;

  @Prop({ required: true, min: 1 })
  capacity: number = 20;

  @Prop({ type: String, default: null })
  room: string | null = null;

  @Prop({ default: false })
  womenOnly: boolean = false;

  // Local calendar dates, "YYYY-MM-DD". effectiveUntil null means it runs
  // until someone stops it.
  @Prop({ required: true })
  effectiveFrom: string = '';

  @Prop({ type: String, default: null })
  effectiveUntil: string | null = null;

  @Prop({ default: true })
  isActive: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const RecurrenceRuleSchema = SchemaFactory.createForClass(RecurrenceRule);

RecurrenceRuleSchema.index({ branch: 1, isActive: 1, weekday: 1 });

export const SESSION_STATUSES = ['scheduled', 'cancelled', 'completed'] as const;
export type SessionStatus = (typeof SESSION_STATUSES)[number];

/**
 * One occurrence of a class.
 *
 * bookedCount is denormalised onto the session rather than counted from the
 * bookings collection, because it is the field capacity is enforced against —
 * and enforcing capacity means an atomic conditional update on one document,
 * which a count cannot give you. BookingsService keeps the two in step.
 */
@Schema({ timestamps: true })
export class ClassSession {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ClassType', required: true })
  classType!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', required: true })
  branch!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trainer', default: null })
  trainer: Types.ObjectId | null = null;

  // Real instants. The wall-clock time and the local day are derived from
  // these for display, so there is one source of truth about when a class is.
  @Prop({ required: true })
  startsAt: Date = new Date();

  @Prop({ required: true })
  endsAt: Date = new Date();

  // The local calendar date this belongs to, denormalised so the timetable can
  // group and query by day without converting every row. A 23:30 Cairo class
  // belongs to that evening, not to the following UTC day.
  @Prop({ required: true })
  localDate: string = '';

  @Prop({ required: true, min: 1 })
  capacity: number = 20;

  @Prop({ required: true, default: 0, min: 0 })
  bookedCount: number = 0;

  @Prop({ type: String, default: null })
  room: string | null = null;

  @Prop({ default: false })
  womenOnly: boolean = false;

  @Prop({ required: true, enum: SESSION_STATUSES, default: 'scheduled' })
  status: SessionStatus = 'scheduled';

  @Prop({ type: String, default: null })
  cancellationReason: string | null = null;

  // Which rule generated this, so regenerating the horizon can tell its own
  // occurrences from ones a staff member added by hand. A session with no rule
  // is a one-off and is never touched by regeneration.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'RecurrenceRule', default: null })
  rule: Types.ObjectId | null = null;

  // Set once a staff member edits an occurrence, so regeneration leaves it
  // alone. Without this, fixing next Tuesday's trainer would be silently
  // reverted the next time the horizon extended.
  @Prop({ default: false })
  isOverridden: boolean = false;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ClassSessionSchema = SchemaFactory.createForClass(ClassSession);

// The timetable query: a branch's sessions across a date range.
ClassSessionSchema.index({ branch: 1, localDate: 1, startsAt: 1 });
// Backs "what is on today" and the reminder sweep.
ClassSessionSchema.index({ status: 1, startsAt: 1 });
// Lets regeneration find a rule's existing occurrences cheaply.
ClassSessionSchema.index({ rule: 1, localDate: 1 });
// One occurrence per rule per day: the guard that makes regeneration
// idempotent, so extending the horizon twice cannot double the timetable.
ClassSessionSchema.index(
  { rule: 1, startsAt: 1 },
  { unique: true, partialFilterExpression: { rule: { $type: 'objectId' } } }
);
