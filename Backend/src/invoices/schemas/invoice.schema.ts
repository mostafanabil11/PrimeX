import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';

export type InvoiceDocument = HydratedDocument<Invoice>;

// cash     — taken at the front desk, which is how a large share of Egyptian
//            gym memberships are actually paid for
// instapay — a manual bank transfer to the gym's InstaPay number, confirmed by
//            a member sending the receipt over WhatsApp. Settles exactly like
//            cash (pending invoice, staff mark it paid), but recorded as its
//            own method: an InstaPay transfer lands in the bank account and
//            cash lands in the drawer, and reconciling the two at month end is
//            impossible if the books call them the same thing.
// wallet   — a mobile-money transfer (Vodafone Cash and the other operator
//            wallets). Settles by hand exactly like InstaPay; separate for the
//            same reconciliation reason, because the money arrives in a
//            different account.
// card     — DORMANT. Taken online through Paymob. PrimeX does not offer card
//            payment, and the route that creates one (POST /join) is closed by
//            the membershipSales feature flag, so no new invoice can carry
//            this value. It stays in the union deliberately: the Paymob
//            integration is intact behind that flag, and re-enabling it should
//            be a config change rather than a schema migration. Do not offer
//            it in a DTO a member can post to — see join/dto/index.ts.
export const PAYMENT_METHODS = ['cash', 'instapay', 'wallet', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// The methods actually offered today: settled by a human, no gateway. Every
// member-facing DTO validates against this rather than PAYMENT_METHODS, so
// removing an option from the product is one edit and cannot be bypassed by
// posting a different string.
export const OFFERED_PAYMENT_METHODS = ['cash', 'instapay', 'wallet'] as const;
export type OfferedPaymentMethod = (typeof OFFERED_PAYMENT_METHODS)[number];

export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

// What was bought. Only membership for now; PT packages join it in a later
// phase, which is why this is a discriminated line rather than a plan field
// on the invoice itself.
export const LINE_KINDS = ['membership', 'joining_fee', 'pt_package'] as const;
export type LineKind = (typeof LINE_KINDS)[number];

// A full snapshot, like the plan snapshot on a subscription. An invoice is a
// financial record: what it says was charged must stay true even after the
// plan is renamed, repriced or withdrawn.
@Schema({ _id: false })
export class InvoiceLine {
  @Prop({ required: true, enum: LINE_KINDS })
  kind!: LineKind;

  @Prop({ required: true })
  description: string = '';

  // Points back at the plan or package for reporting. Never read for pricing.
  @Prop({ type: MongooseSchema.Types.ObjectId, default: null })
  reference: Types.ObjectId | null = null;

  @Prop({ required: true, min: 0 })
  unitPriceMinorUnits: number = 0;

  @Prop({ required: true, min: 1 })
  quantity: number = 1;

  @Prop({ required: true, min: 0 })
  lineTotalMinorUnits: number = 0;
}

export const InvoiceLineSchema = SchemaFactory.createForClass(InvoiceLine);

@Schema({ timestamps: true })
export class Invoice {
  // Human-readable, e.g. "INV-20260822-0007". Separate from _id because
  // members and staff read it aloud on the phone.
  @Prop({ required: true, unique: true })
  invoiceNumber: string = '';

  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: true })
  member!: Types.ObjectId;

  // Contact details as given at the time. A member changing their email later
  // must not rewrite which address a past receipt went to.
  //
  // Nullable because a walk-in or a WhatsApp reservation may not give one at
  // all. Null means "no receipt was emailed", which is the truth; storing ''
  // would claim an address existed and make the no-email case invisible.
  @Prop({ type: String, default: null })
  email: string | null = null;

  @Prop({ type: String, default: null })
  phone: string | null = null;

  @Prop({ type: [InvoiceLineSchema], required: true })
  lines: InvoiceLine[] = [];

  // All minor units. Held as separate fields rather than recomputed on read,
  // so the arithmetic that was actually charged is what is shown back.
  @Prop({ required: true, min: 0 })
  subtotalMinorUnits: number = 0;

  @Prop({ default: 0, min: 0 })
  discountMinorUnits: number = 0;

  @Prop({ default: 0, min: 0 })
  taxMinorUnits: number = 0;

  @Prop({ required: true, min: 0 })
  totalMinorUnits: number = 0;

  @Prop({ default: 'EGP' })
  currency: string = 'EGP';

  @Prop({ type: String, default: null })
  couponCode: string | null = null;

  // Why a membership was discounted. Kept separate from couponCode rather
  // than sharing it: a coupon is a code the customer typed and is a shop
  // instrument, an offer is a promotion the gym was running at the time and
  // nobody had to know about. Only one of the two is ever set.
  @Prop({ type: String, default: null })
  offerName: string | null = null;

  @Prop({ required: true, enum: PAYMENT_METHODS })
  paymentMethod!: PaymentMethod;

  @Prop({ required: true, enum: PAYMENT_STATUSES, default: 'pending' })
  paymentStatus: PaymentStatus = 'pending';

  @Prop({ type: Date, default: null })
  paidAt: Date | null = null;

  // Who took the money, for a cash payment. The only record of which staff
  // member handled it.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', default: null })
  receivedBy: Types.ObjectId | null = null;

  // --- Paymob ---

  @Prop({ type: String, default: null })
  paymobOrderId: string | null = null;

  @Prop({ type: String, default: null })
  paymobTransactionId: string | null = null;

  // Shown on the receipt so a member can recognise which card they used.
  @Prop({ type: String, default: null })
  cardLast4: string | null = null;

  @Prop({ type: String, default: null })
  cardBrand: string | null = null;

  // What this paid for. Set once the subscription exists, which for a card
  // payment is before the webhook lands and for cash is at creation.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Subscription', default: null })
  subscription: Types.ObjectId | null = null;

  // Guards against a double-submitted join creating two invoices and two
  // memberships. Same mechanism the storefront used for orders.
  @Prop({ type: String, default: null })
  idempotencyKey: string | null = null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const InvoiceSchema = SchemaFactory.createForClass(Invoice);

// A member's payment history, newest first.
InvoiceSchema.index({ member: 1, createdAt: -1 });
// The webhook arrives knowing only Paymob's order id.
InvoiceSchema.index(
  { paymobOrderId: 1 },
  { partialFilterExpression: { paymobOrderId: { $type: 'string' } } }
);
// Unique only where actually set — a partial index, not sparse, for the same
// reason the user schema uses one: Mongoose writes an explicit null rather
// than omitting the field, and sparse does not exempt nulls.
InvoiceSchema.index(
  { idempotencyKey: 1 },
  { unique: true, partialFilterExpression: { idempotencyKey: { $type: 'string' } } }
);
// Backs the revenue summary and the abandoned-invoice sweep.
InvoiceSchema.index({ paymentStatus: 1, createdAt: -1 });
