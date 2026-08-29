import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type BookingDocument = HydratedDocument<Booking>;

// booked    — holds a place
// attended  — turned up, marked by staff or the coach
// no_show   — did not turn up, and did not cancel; counts toward suspension
// cancelled — gave the place back
export const BOOKING_STATUSES = ['booked', 'attended', 'no_show', 'cancelled'] as const;
export type BookingStatus = (typeof BOOKING_STATUSES)[number];

@Schema({ timestamps: true })
export class Booking {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  member!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ClassSession', required: true })
  session!: Types.ObjectId;

  // Which membership this was booked against. Kept because entitlement is
  // decided at the moment of booking — if the member later renews onto a
  // different plan, the record of what allowed this booking should not change.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subscription', required: true })
  subscription!: Types.ObjectId;

  @Prop({ required: true, enum: BOOKING_STATUSES, default: 'booked' })
  status: BookingStatus = 'booked';

  // Whether a class credit was taken. Unlimited and staff-added bookings take
  // none, so cancelling must not hand one back — this is the flag that decides.
  @Prop({ default: false })
  creditConsumed: boolean = false;

  // Denormalised from the session so "my past classes" and the no-show sweep
  // do not have to join. A session's time can be edited, but a booking's
  // record of when it was is a historical fact.
  @Prop({ required: true })
  sessionStartsAt: Date = new Date();

  @Prop({ type: Date, default: null })
  cancelledAt: Date | null = null;

  // True when staff cancelled the whole session rather than the member
  // dropping out. Those never count as a late cancellation and always refund.
  @Prop({ default: false })
  cancelledByGym: boolean = false;

  @Prop({ type: Date, default: null })
  attendanceMarkedAt: Date | null = null;

  // Stamped when the evening-before reminder goes out. The sweep filters on
  // this being null, which is what makes it safe to run repeatedly — a
  // restart, an overlapping run or a manual trigger cannot email twice.
  @Prop({ type: Date, default: null })
  reminderSentAt: Date | null = null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BookingSchema = SchemaFactory.createForClass(Booking);

/**
 * One live booking per member per session.
 *
 * Partial on status so a cancelled booking does not block rebooking — someone
 * who drops out and changes their mind should be able to take the place back
 * if it is still there. Without the filter, the unique index would make that
 * a permanent refusal.
 */
BookingSchema.index(
  { member: 1, session: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['booked', 'attended', 'no_show'] } },
  }
);

// "My upcoming classes" and "my history".
BookingSchema.index({ member: 1, sessionStartsAt: -1 });
// The roster for one session.
BookingSchema.index({ session: 1, status: 1 });
// Backs the no-show suspension count and the evening-before reminder.
BookingSchema.index({ status: 1, sessionStartsAt: 1 });
