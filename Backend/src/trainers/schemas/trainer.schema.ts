import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';
import { WEEKDAYS, Weekday } from '@/branches/schemas/branch.schema';

export type TrainerDocument = HydratedDocument<Trainer>;

// A recurring window in which the trainer is available. Wall-clock, weekly,
// for the same reason branch opening hours are: it repeats, so an instant
// would be the wrong shape.
//
// This is availability, not a booking. Phase 5 subtracts existing PT bookings
// and the classes they teach to derive genuinely free slots.
@Schema({ _id: false })
export class AvailabilityWindow {
  @Prop({ required: true, enum: WEEKDAYS })
  day!: Weekday;

  @Prop({ required: true })
  startsAt: string = '';

  @Prop({ required: true })
  endsAt: string = '';
}

export const AvailabilityWindowSchema = SchemaFactory.createForClass(AvailabilityWindow);

@Schema({ timestamps: true })
export class Trainer {
  @Prop({ required: true, trim: true })
  name: string = '';

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string = '';

  @Prop({ type: String, default: null })
  photo: string | null = null;

  @Prop({ type: String, default: null })
  headline: string | null = null;

  @Prop({ type: String, default: null })
  bio: string | null = null;

  @Prop({ type: [String], default: [] })
  specialties: string[] = [];

  @Prop({ type: [String], default: [] })
  certifications: string[] = [];

  @Prop({ type: [String], default: [] })
  languages: string[] = [];

  @Prop({ default: 0, min: 0 })
  yearsOfExperience: number = 0;

  // A trainer can work across several sites. An array rather than a single ref
  // because covering another branch is routine, not an exception.
  @Prop({ type: [{ type: MongooseSchema.Types.ObjectId, ref: 'Branch' }], default: [] })
  branches: Types.ObjectId[] = [];

  @Prop({ type: [AvailabilityWindowSchema], default: [] })
  availability: AvailabilityWindow[] = [];

  // Minor units per hour, for personal training. null means PT is not offered
  // by this trainer — different from a rate of zero.
  @Prop({ type: Number, default: null, min: 0 })
  hourlyRateMinorUnits: number | null = null;

  // Optional link to a login. Set once a trainer needs the Phase 5 portal;
  // until then they exist as a public profile with no account.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  user: Types.ObjectId | null = null;

  @Prop({ type: String, default: null })
  instagramUrl: string | null = null;

  // Denormalised off approved reviews, the same way Product does it, so a
  // trainer card never has to aggregate on render. Recomputed when Phase 5
  // points the reviews module at trainers.
  @Prop({ default: 0, min: 0, max: 5 })
  averageRating: number = 0;

  @Prop({ default: 0, min: 0 })
  reviewCount: number = 0;

  @Prop({ default: 0 })
  sortOrder: number = 0;

  @Prop({ default: true })
  isActive: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TrainerSchema = SchemaFactory.createForClass(Trainer);

TrainerSchema.index({ isActive: 1, sortOrder: 1 });
// Backs the branch detail page's "trainers based here" section.
TrainerSchema.index({ branches: 1, isActive: 1 });
