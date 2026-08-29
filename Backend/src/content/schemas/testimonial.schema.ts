import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type TestimonialDocument = HydratedDocument<Testimonial>;

// A member quote, entered by staff rather than submitted by the member. That
// is a deliberate difference from reviews: these are marketing copy on the
// homepage, so they are curated, not moderated.
@Schema({ timestamps: true })
export class Testimonial {
  @Prop({ required: true, trim: true })
  name: string = '';

  @Prop({ required: true, trim: true })
  quote: string = '';

  @Prop({ type: String, default: null })
  photo: string | null = null;

  // What they do, or how long they have trained here — "Member since 2021",
  // "Competitive powerlifter". Free text because it is a caption, not data.
  @Prop({ type: String, default: null })
  attribution: string | null = null;

  @Prop({ type: Number, default: null, min: 1, max: 5 })
  rating: number | null = null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', default: null })
  branch: Types.ObjectId | null = null;

  @Prop({ default: 0 })
  sortOrder: number = 0;

  @Prop({ default: true })
  isActive: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const TestimonialSchema = SchemaFactory.createForClass(Testimonial);

TestimonialSchema.index({ isActive: 1, sortOrder: 1 });
