import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';
import { ProductSize, PRODUCT_SIZES } from './product-size-stock.schema';

export const STOCK_MOVEMENT_REASONS = [
  'order_placed',
  'order_cancelled',
  'order_rollback',
  'admin_adjustment',
] as const;
export type StockMovementReason = (typeof STOCK_MOVEMENT_REASONS)[number];

export type StockMovementDocument = HydratedDocument<StockMovement>;

// Append-only — no update/delete methods are exposed anywhere on this model.
// Every call to ProductsService.decrementStock/restoreStock writes one of
// these, so the ledger can't drift from what actually happened to stock the
// way a "trust the caller to log it" design could.
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class StockMovement {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true, enum: PRODUCT_SIZES })
  size!: ProductSize;

  // Positive = stock added back, negative = stock consumed. Never zero.
  @Prop({ required: true })
  quantityChange: number = 0;

  // Stock level immediately after this movement — lets "why is this 3 and
  // not 5" be answered by reading the ledger, not by replaying history.
  @Prop({ required: true, min: 0 })
  resultingStock: number = 0;

  @Prop({ required: true, enum: STOCK_MOVEMENT_REASONS })
  reason!: StockMovementReason;

  // Free-form pointer to whatever caused this — an order number today,
  // could be an admin user id or a return RMA id later.
  @Prop({ type: String, default: null })
  reference: string | null = null;

  createdAt?: Date;
}

export const StockMovementSchema = SchemaFactory.createForClass(StockMovement);

StockMovementSchema.index({ product: 1, createdAt: -1 });
