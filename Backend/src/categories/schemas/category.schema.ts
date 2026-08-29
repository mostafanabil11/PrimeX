import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type CategoryDocument = HydratedDocument<Category>;

@Schema({ timestamps: true })
export class Category {
  @Prop({ required: true, trim: true })
  name: string = '';

  @Prop({ required: true, trim: true, lowercase: true })
  slug: string = '';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Category', default: null })
  parent: Types.ObjectId | null = null;

  @Prop({ type: String, default: null })
  image: string | null = null;

  @Prop({ type: String, default: null })
  description: string | null = null;

  @Prop({ default: 0 })
  displayOrder: number = 0;

  @Prop({ default: false })
  isFeaturedOnHome: boolean = false;

  @Prop({ default: true })
  isActive: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const CategorySchema = SchemaFactory.createForClass(Category);

// Slugs only need to be unique within their own parent, so "pants" can exist
// under both Men and Women without collision. Top-level categories (parent: null)
// are still unique among themselves since they share the same parent value.
CategorySchema.index({ parent: 1, slug: 1 }, { unique: true });
