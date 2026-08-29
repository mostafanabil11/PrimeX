import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

@Schema({ _id: false })
export class WishlistItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true })
  addedAt: Date = new Date();
}

export const WishlistItemSchema = SchemaFactory.createForClass(WishlistItem);

export type WishlistDocument = HydratedDocument<Wishlist>;

// One document per user, same shape as Cart — a separate collection rather
// than an array on User so wishlist growth never bloats the document every
// auth check reads.
@Schema({ timestamps: true })
export class Wishlist {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true, unique: true })
  user!: Types.ObjectId;

  @Prop({ type: [WishlistItemSchema], default: [] })
  items: WishlistItem[] = [];
}

export const WishlistSchema = SchemaFactory.createForClass(Wishlist);
