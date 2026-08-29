import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type CtaClickDocument = HydratedDocument<CtaClick>;

// whatsapp      — a generic "Join now" / "Talk to us" button, no plan attached
// reserve_start — someone clicked through to reserve a specific plan
//
// Two kinds rather than one, and the distinction is the point of the whole
// collection: reserve_start is the denominator for form abandonment. If a
// hundred people click "Choose Elite" and twelve finish the form, putting a
// form in front of the WhatsApp handoff cost eighty-eight conversations, and
// this is the only place that number exists.
export const CTA_CLICK_KINDS = ['whatsapp', 'reserve_start'] as const;
export type CtaClickKind = (typeof CTA_CLICK_KINDS)[number];

/**
 * One click on a call-to-action, recorded anonymously.
 *
 * Deliberately almost empty. There is no path, no referrer, no IP and no user
 * agent, because the only question being asked is "is the website bringing
 * people in" — per-page attribution was considered and explicitly not wanted.
 * Storing less also means there is no personal data here to reason about.
 *
 * Kept out of the Enquiry collection on purpose: staff work that as an inbox,
 * and filling it with rows nobody can act on would make it useless.
 */
@Schema({ timestamps: { createdAt: true, updatedAt: false } })
export class CtaClick {
  @Prop({ required: true, enum: CTA_CLICK_KINDS })
  kind!: CtaClickKind;

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Plan', default: null })
  plan: Types.ObjectId | null = null;

  // sha256(clientId + kind + plan + hour). Collapses the double-taps and the
  // back-and-forth of one person deciding, which would otherwise read as
  // demand. Hashed rather than stored raw so the browser id itself is not
  // retained. Keyed by browser, not IP: the frontend reaches us through Next's
  // rewrite, so every visitor shares one address and an IP-keyed dedupe would
  // collapse the entire day into a single row.
  @Prop({ required: true })
  dedupeKey!: string;

  createdAt?: Date;
}

export const CtaClickSchema = SchemaFactory.createForClass(CtaClick);

CtaClickSchema.index(
  { dedupeKey: 1 },
  { unique: true, partialFilterExpression: { dedupeKey: { $type: 'string' } } }
);

// The funnel report: count by kind over a rolling window.
CtaClickSchema.index({ kind: 1, createdAt: -1 });

// This is the highest-volume collection in the app and nothing here is worth
// keeping for years, so it expires itself rather than growing without bound.
// Comfortably longer than any window the dashboard offers.
CtaClickSchema.index({ createdAt: 1 }, { expireAfterSeconds: 400 * 24 * 60 * 60 });
