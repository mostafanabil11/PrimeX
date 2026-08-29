import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type EnquiryDocument = HydratedDocument<Enquiry>;

// contact — someone asking a question through the contact page
// trial   — someone asking for a free session, which is the higher-intent one
//
// One collection rather than two: the fields are the same, staff work them from
// the same inbox, and the difference that matters is how urgently a trial gets
// called back. A `type` field expresses that; two near-identical modules would
// not have.
export const ENQUIRY_TYPES = ['contact', 'trial'] as const;
export type EnquiryType = (typeof ENQUIRY_TYPES)[number];

// A deliberately linear pipeline. Staff move an enquiry forward, and `lost`
// is the one exit that is not `converted` — knowing the ratio between those
// two is the only way to tell whether the trial form is working.
export const ENQUIRY_STATUSES = ['new', 'contacted', 'booked', 'converted', 'lost'] as const;
export type EnquiryStatus = (typeof ENQUIRY_STATUSES)[number];

@Schema({ _id: true, timestamps: false })
export class EnquiryNote {
  _id!: Types.ObjectId;

  @Prop({ required: true })
  body: string = '';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  author: Types.ObjectId | null = null;

  @Prop({ required: true })
  createdAt: Date = new Date();
}

export const EnquiryNoteSchema = SchemaFactory.createForClass(EnquiryNote);

@Schema({ timestamps: true })
export class Enquiry {
  @Prop({ required: true, enum: ENQUIRY_TYPES })
  type!: EnquiryType;

  @Prop({ required: true, trim: true })
  name: string = '';

  // Phone is required and email is not, which is the opposite of most web
  // forms. Egyptian gyms convert leads by calling them, and asking for less
  // up front is what makes the form worth having at all.
  @Prop({ required: true, trim: true })
  phone: string = '';

  @Prop({ type: String, default: null, lowercase: true, trim: true })
  email: string | null = null;

  @Prop({ type: String, default: null })
  message: string | null = null;

  // What they want out of it — "lose weight", "get stronger". Free text
  // because a dropdown of goals is a survey, and this is a lead form.
  @Prop({ type: String, default: null })
  goal: string | null = null;

  @Prop({ type: String, default: null })
  preferredTime: string | null = null;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Branch', default: null })
  branch: Types.ObjectId | null = null;

  // Set when someone lands here from a trainer profile, so staff know who to
  // put them with rather than starting the conversation cold.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Trainer', default: null })
  trainer: Types.ObjectId | null = null;

  // Where the enquiry came from — the page path. Cheap attribution, and the
  // only way to answer "is the trainer page actually generating leads".
  @Prop({ type: String, default: null })
  source: string | null = null;

  @Prop({ required: true, enum: ENQUIRY_STATUSES, default: 'new' })
  status: EnquiryStatus = 'new';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  assignedTo: Types.ObjectId | null = null;

  @Prop({ type: [EnquiryNoteSchema], default: [] })
  notes: EnquiryNote[] = [];

  createdAt?: Date;
  updatedAt?: Date;
}

export const EnquirySchema = SchemaFactory.createForClass(Enquiry);

// The inbox default: open enquiries, newest first.
EnquirySchema.index({ status: 1, createdAt: -1 });
EnquirySchema.index({ type: 1, status: 1, createdAt: -1 });
// Backs the duplicate check on submit.
EnquirySchema.index({ phone: 1, createdAt: -1 });
