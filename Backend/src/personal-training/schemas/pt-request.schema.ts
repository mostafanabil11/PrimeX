import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type PtRequestDocument = HydratedDocument<PtRequest>;

/**
 * Someone asking to train one-to-one with a named coach.
 *
 * WHY THIS IS NOT AN ENQUIRY. An enquiry is a question — "do you do PT?" — and
 * lives or dies in an inbox. This is a commitment to a specific coach with a
 * start date attached, and it behaves like the membership reservation it was
 * modelled on: the member account is created or matched on the phone number
 * before anything else, so the person exists in the system whether or not they
 * ever send the WhatsApp message that follows. Staff can then work it, and the
 * reference code is what ties the chat to the record.
 *
 * WHY THERE IS NO PRICE ON IT. Deliberate, and expected to change. Every
 * trainer already carries `hourlyRateMinorUnits`, and the gym has not yet
 * decided how PT is sold — single sessions, packs, discounts for volume. Until
 * that exists there is nothing to bill, so this raises no invoice: a
 * zero-value invoice would be a lie in the admin revenue screens, which report
 * outstanding money. The WhatsApp thread settles the price for now.
 *
 * WHEN PRICING ARRIVES, this is what changes and nothing else: add
 * `sessionsRequested`, `priceMinorUnits` and an `invoice` ref here; raise the
 * invoice in the service beside the request; show the total in the reserve
 * form and the WhatsApp message. The record, the member matching, the
 * reference code, the status pipeline and the admin screen all stay as they
 * are. That is why this is a record rather than a mailto.
 */

// new       — just landed, nobody has spoken to them
// contacted — staff have opened the WhatsApp thread
// scheduled — coach and times agreed; this is the one that means "it's on"
// completed — the block of sessions finished
// cancelled — did not go ahead, from either side
//
// Shorter than the enquiry pipeline on purpose. An enquiry needs `lost` as a
// distinct outcome from `converted` because measuring that ratio is the point
// of a lead form. Here the useful question is only "is this arranged yet".
export const PT_REQUEST_STATUSES = [
  'new',
  'contacted',
  'scheduled',
  'completed',
  'cancelled',
] as const;
export type PtRequestStatus = (typeof PT_REQUEST_STATUSES)[number];

export const PT_REQUEST_ORIGINS = ['website', 'front_desk'] as const;
export type PtRequestOrigin = (typeof PT_REQUEST_ORIGINS)[number];

@Schema({ _id: true, timestamps: false })
export class PtRequestNote {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  body: string = '';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  author: Types.ObjectId | null = null;

  @Prop({ required: true })
  createdAt: Date = new Date();
}

export const PtRequestNoteSchema = SchemaFactory.createForClass(PtRequestNote);

/**
 * The coach as they were when the request was made.
 *
 * Same reasoning as Subscription.planSnapshot: a trainer can leave, be renamed
 * or be deactivated, and none of that should silently rewrite what somebody
 * asked for six months ago. The ref below is for joining to the live record;
 * this is for reading the history truthfully.
 */
@Schema({ _id: false })
export class PtTrainerSnapshot {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trainer', required: true })
  trainer!: Types.ObjectId;

  @Prop({ required: true })
  name: string = '';

  @Prop({ required: true })
  slug: string = '';

  @Prop({ type: String, default: null })
  headline: string | null = null;
}

export const PtTrainerSnapshotSchema = SchemaFactory.createForClass(PtTrainerSnapshot);

@Schema({ timestamps: true })
export class PtRequest {
  @Prop({ type: PtTrainerSnapshotSchema, required: true })
  trainerSnapshot!: PtTrainerSnapshot;

  // The member account, created or matched on the phone number exactly as the
  // membership reservation does. Required: a request with no member behind it
  // would be an enquiry, and there is already a module for those.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  member!: Types.ObjectId;

  // Denormalised off the member for the admin list: staff search by the number
  // somebody is messaging from, and a $lookup on every keystroke to resolve a
  // ref is the wrong shape for that. Enquiry indexes phone for the same reason.
  @Prop({ required: true, trim: true })
  phone: string = '';

  @Prop({ required: true, trim: true })
  memberName: string = '';

  // What they asked for. Free text on the last two because this is a
  // conversation starter for the coach, not a form to be aggregated.
  @Prop({ type: Date, required: true })
  preferredStartsAt!: Date;

  /** "Weekday evenings", "Saturday mornings" — matched against the coach's
   *  availability windows by a human, not by the system. */
  @Prop({ type: String, default: null })
  preferredTimes: string | null = null;

  /** "Squat 140", "back to running after a knee op". What the coach needs. */
  @Prop({ type: String, default: null })
  goal: string | null = null;

  // Read aloud in a WhatsApp thread and typed back at the desk, so it uses the
  // same unambiguous alphabet as a membership reference. Unique across PT
  // requests; it does not share a namespace with subscription references, and
  // does not need to — they are told apart by which screen they are typed into.
  @Prop({ type: String, default: null })
  referenceCode: string | null = null;

  @Prop({ required: true, enum: PT_REQUEST_STATUSES, default: 'new' })
  status: PtRequestStatus = 'new';

  @Prop({ required: true, enum: PT_REQUEST_ORIGINS, default: 'website' })
  origin: PtRequestOrigin = 'website';

  @Prop({ type: [PtRequestNoteSchema], default: [] })
  notes: PtRequestNote[] = [];

  createdAt?: Date;
  updatedAt?: Date;
}

export const PtRequestSchema = SchemaFactory.createForClass(PtRequest);

// The admin default: open requests, newest first.
PtRequestSchema.index({ status: 1, createdAt: -1 });
// "Everything for this coach" — the view a head of PT actually wants.
PtRequestSchema.index({ 'trainerSnapshot.trainer': 1, status: 1, createdAt: -1 });
// Backs both the member's own history and the duplicate check on submit.
PtRequestSchema.index({ member: 1, createdAt: -1 });
PtRequestSchema.index({ phone: 1, createdAt: -1 });
// Partial, so the many rows that never get a code do not collide on null —
// the same guard Subscription uses for its reference.
PtRequestSchema.index(
  { referenceCode: 1 },
  { unique: true, partialFilterExpression: { referenceCode: { $type: 'string' } } }
);
