import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';

export type ClassTypeDocument = HydratedDocument<ClassType>;

// The template for a class, not an occurrence of one. "HIIT Inferno" is a
// ClassType; the 06:30 run of it next Tuesday at New Cairo is a ClassSession,
// which Phase 4 adds and which points back here.
@Schema({ timestamps: true })
export class ClassType {
  @Prop({ required: true, trim: true })
  name: string = '';

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string = '';

  @Prop({ type: String, default: null })
  description: string | null = null;

  @Prop({ type: String, default: null })
  image: string | null = null;

  // 1–5. Shown as a bar on the class card, and the main thing a nervous
  // beginner filters on.
  @Prop({ default: 3, min: 1, max: 5 })
  intensity: number = 3;

  @Prop({ required: true, min: 5, max: 300 })
  durationMinutes: number = 45;

  @Prop({ type: [String], default: [] })
  equipment: string[] = [];

  // The capacity a new session inherits. A session may override it — a studio
  // holds fewer people than the main floor — so this is a starting point, not
  // a rule.
  @Prop({ default: 20, min: 1 })
  defaultCapacity: number = 20;

  // Which token from the design system colours this class in the timetable.
  // Stored as a name rather than a hex value so a palette change is one edit
  // in CSS instead of a database migration.
  @Prop({ type: String, default: null })
  colorToken: string | null = null;

  // Recomputed from the approved-review set whenever one is moderated — see
  // ReviewsService.recomputeAggregate. Stored here rather than aggregated on
  // every read, since the class list and cards read it constantly and reviews
  // change rarely.
  @Prop({ default: 0 })
  averageRating: number = 0;

  @Prop({ default: 0 })
  reviewCount: number = 0;

  @Prop({ default: 0 })
  sortOrder: number = 0;

  @Prop({ default: true })
  isActive: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const ClassTypeSchema = SchemaFactory.createForClass(ClassType);

ClassTypeSchema.index({ isActive: 1, sortOrder: 1 });
