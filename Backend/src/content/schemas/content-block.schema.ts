import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ContentBlockDocument = HydratedDocument<ContentBlock>;

// One row per overridden key. Keys with no row fall back to the default in
// content.registry.ts, so an empty collection still renders a complete site —
// which is what makes this safe to ship before anyone has written any copy.
@Schema({ timestamps: true })
export class ContentBlock {
  @Prop({ required: true, unique: true, trim: true })
  key: string = '';

  // Only one of these is meaningful, decided by the registry's type for this
  // key. Kept as separate fields rather than one Mixed column so Mongoose can
  // still type and validate them.
  @Prop({ type: String, default: null })
  value: string | null = null;

  @Prop({ type: [String], default: undefined })
  values?: string[];

  @Prop({ type: String, default: null })
  valueAr: string | null = null;

  @Prop({ type: [String], default: undefined })
  valuesAr?: string[];

  createdAt?: Date;
  updatedAt?: Date;
}

export const ContentBlockSchema = SchemaFactory.createForClass(ContentBlock);
