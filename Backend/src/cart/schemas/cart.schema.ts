import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';
import { ProductSize, PRODUCT_SIZES } from '@/products/schemas/product-size-stock.schema';

// Deliberately holds only product/size/quantity — never a price. Storing a
// price here would recreate the exact trust-boundary bug the client cart
// has (price gets set once and then trusted forever); every read re-prices
// from Product instead. See CartService.resolveItems.
@Schema({ _id: false })
export class CartItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true, enum: PRODUCT_SIZES })
  size!: ProductSize;

  @Prop({ required: true, min: 1 })
  quantity: number = 1;
}

export const CartItemSchema = SchemaFactory.createForClass(CartItem);

export type CartDocument = HydratedDocument<Cart>;

@Schema({ timestamps: true })
export class Cart {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  user!: Types.ObjectId;

  @Prop({ type: [CartItemSchema], default: [] })
  items: CartItem[] = [];

  // Null until a recovery email actually goes out for the cart's *current*
  // contents. Cleared back to null whenever items change (see
  // CartService.addItem/updateItem) so a fresh round of activity can earn
  // its own reminder later rather than being permanently exempted.
  @Prop({ type: Date, default: null })
  abandonedEmailSentAt: Date | null = null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CartSchema = SchemaFactory.createForClass(Cart);
