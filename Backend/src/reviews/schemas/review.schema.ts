import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export const REVIEW_STATUSES = ['pending', 'approved', 'rejected'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

export type ReviewDocument = HydratedDocument<Review>;

@Schema({ timestamps: true })
export class Review {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'ClassType', required: true })
  classType!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  user!: Types.ObjectId;

  // The attended booking that proves this reviewer actually took the class —
  // kept for traceability, never shown to other members.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Booking', required: true })
  booking!: Types.ObjectId;

  @Prop({ required: true, min: 1, max: 5 })
  rating: number = 5;

  @Prop({ required: true, trim: true, maxlength: 120 })
  title: string = '';

  @Prop({ required: true, trim: true, maxlength: 2000 })
  body: string = '';

  // New reviews start hidden from the public class page until an admin
  // approves them.
  @Prop({ required: true, enum: REVIEW_STATUSES, default: 'pending' })
  status: ReviewStatus = 'pending';

  createdAt?: Date;
  updatedAt?: Date;
}

export const ReviewSchema = SchemaFactory.createForClass(Review);

// One review per member per class type — a second attempt should edit the
// first, not create a duplicate.
ReviewSchema.index({ classType: 1, user: 1 }, { unique: true });
// Backs the public "approved reviews for this class, newest first" read.
ReviewSchema.index({ classType: 1, status: 1, createdAt: -1 });
// Backs the admin moderation queue.
ReviewSchema.index({ status: 1, createdAt: -1 });
