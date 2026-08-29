import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type CouponRedemptionDocument = HydratedDocument<CouponRedemption>;

// One row per (redeemer, coupon, order). Existence of a row is the reservation
// itself — created the moment a coupon is applied at checkout, deleted again
// if that order's payment never completes, mirroring the stock-reservation
// lifecycle in OrdersService.
//
// The redeemer is either a user (account checkout) or an email (guest
// checkout) — exactly one of the two is set, and each gets its own unique
// index below.
@Schema({ timestamps: true })
export class CouponRedemption {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Coupon', required: true })
  coupon!: Types.ObjectId;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, default: null })
  user: Types.ObjectId | null = null;

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  guestEmail: string | null = null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Order', required: true, unique: true })
  order!: Types.ObjectId;

  @Prop({ required: true, min: 0 })
  discountAmount: number = 0;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CouponRedemptionSchema = SchemaFactory.createForClass(CouponRedemption);

// A redeemer may use a given coupon at most once — this is what a per-person
// limit of 1 actually means here, and the unique index is what makes it hold
// under two concurrent checkout requests racing each other.
//
// Both are *partial* indexes. A plain unique index would treat the null side
// as a value, so every guest row (user: null) would collide with every other
// guest row for the same coupon, and vice versa.
CouponRedemptionSchema.index(
  { coupon: 1, user: 1 },
  { unique: true, partialFilterExpression: { user: { $type: 'objectId' } } }
);

// The guest equivalent. Note this is a weaker guarantee than the user one by
// nature — a determined person can always use another email address. It stops
// casual reuse of a code, which is what it is for.
CouponRedemptionSchema.index(
  { coupon: 1, guestEmail: 1 },
  { unique: true, partialFilterExpression: { guestEmail: { $type: 'string' } } }
);
