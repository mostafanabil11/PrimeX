import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { HydratedDocument } from 'mongoose';
import { EGYPT_GOVERNORATES } from '@/common/utils/egypt.util';

export type BranchDocument = HydratedDocument<Branch>;

export const WEEKDAYS = [
  'sunday',
  'monday',
  'tuesday',
  'wednesday',
  'thursday',
  'friday',
  'saturday',
] as const;
export type Weekday = (typeof WEEKDAYS)[number];

// Opening hours for one weekday. Times are local wall-clock "HH:mm" strings,
// not Dates: a branch opens at 00:00 every Monday regardless of daylight
// saving or what timezone the server happens to run in. Storing an instant
// here would make the schedule drift twice a year.
//
// The gym runs 24/7 and the public site does not render this table — see
// components/admin/branch-form.tsx and app/contact/page.tsx on the frontend.
// The model stays in place for when per-branch hours matter again.
@Schema({ _id: false })
export class OpeningHours {
  @Prop({ required: true, enum: WEEKDAYS })
  day!: Weekday;

  // Closed days keep the row and set isClosed — that way the site can print
  // "Friday: Closed" rather than silently omitting the day, which reads as
  // missing information.
  @Prop({ default: false })
  isClosed: boolean = false;

  @Prop({ type: String, default: '00:00' })
  opensAt: string = '00:00';

  @Prop({ type: String, default: '23:59' })
  closesAt: string = '23:59';
}

export const OpeningHoursSchema = SchemaFactory.createForClass(OpeningHours);

// A recurring women-only window. Near-universal in Egyptian gyms, and it has
// to be structured data rather than a sentence in the description: members
// filter the timetable by it, and booking has to enforce it.
@Schema({ _id: false })
export class WomenOnlyWindow {
  @Prop({ required: true, enum: WEEKDAYS })
  day!: Weekday;

  @Prop({ required: true })
  startsAt: string = '';

  @Prop({ required: true })
  endsAt: string = '';
}

export const WomenOnlyWindowSchema = SchemaFactory.createForClass(WomenOnlyWindow);

@Schema({ timestamps: true })
export class Branch {
  @Prop({ required: true, trim: true })
  name: string = '';

  @Prop({ required: true, unique: true, trim: true, lowercase: true })
  slug: string = '';

  @Prop({ type: String, default: null })
  description: string | null = null;

  // --- Where ---

  @Prop({ required: true, trim: true })
  addressLine: string = '';

  @Prop({ required: true, trim: true })
  city: string = '';

  @Prop({ required: true, enum: EGYPT_GOVERNORATES })
  governorate: string = '';

  // Kept as plain numbers rather than a GeoJSON point: the site draws a map
  // pin and nothing queries by proximity. A 2dsphere index can be added the
  // day "branches near me" becomes a real feature.
  @Prop({ type: Number, default: null })
  latitude: number | null = null;

  @Prop({ type: Number, default: null })
  longitude: number | null = null;

  @Prop({ type: String, default: null })
  googleMapsUrl: string | null = null;

  // --- Contact ---

  @Prop({ type: String, default: null })
  phone: string | null = null;

  @Prop({ type: String, default: null })
  whatsappNumber: string | null = null;

  @Prop({ type: String, default: null })
  email: string | null = null;

  // --- What's there ---

  @Prop({ type: [String], default: [] })
  facilities: string[] = [];

  @Prop({ type: [String], default: [] })
  images: string[] = [];

  @Prop({ type: [OpeningHoursSchema], default: [] })
  openingHours: OpeningHours[] = [];

  @Prop({ type: [WomenOnlyWindowSchema], default: [] })
  womenOnlyWindows: WomenOnlyWindow[] = [];

  // --- Listing ---

  @Prop({ default: 0 })
  sortOrder: number = 0;

  @Prop({ default: true })
  isActive: boolean = true;

  createdAt?: Date;
  updatedAt?: Date;
}

export const BranchSchema = SchemaFactory.createForClass(Branch);

// The public listing is always "active branches in display order", and the
// admin listing is the same query without the isActive term.
BranchSchema.index({ isActive: 1, sortOrder: 1 });
