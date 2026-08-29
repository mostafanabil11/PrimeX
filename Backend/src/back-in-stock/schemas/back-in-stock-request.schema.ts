import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';
import { ProductSize, PRODUCT_SIZES } from '@/products/schemas/product-size-stock.schema';

export type BackInStockRequestDocument = HydratedDocument<BackInStockRequest>;

@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class BackInStockRequest {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true, enum: PRODUCT_SIZES })
  size!: ProductSize;

  @Prop({ required: true, lowercase: true, trim: true })
  email: string = '';

  @Prop({ default: false })
  notified: boolean = false;

  createdAt?: Date;
}

export const BackInStockRequestSchema = SchemaFactory.createForClass(BackInStockRequest);

// One outstanding request per email/product/size — resubmitting just no-ops
// rather than queuing a duplicate email later.
BackInStockRequestSchema.index({ product: 1, size: 1, email: 1 }, { unique: true });
// Backs the "who to email" lookup when a size restocks.
BackInStockRequestSchema.index({ product: 1, size: 1, notified: 1 });
