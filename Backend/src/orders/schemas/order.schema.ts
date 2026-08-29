import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Schema as MongooseSchema, Types, HydratedDocument } from 'mongoose';
import { ProductSize, PRODUCT_SIZES } from '@/products/schemas/product-size-stock.schema';

export const PAYMENT_METHODS = ['cod', 'card'] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Kept deliberately separate from fulfillment status — an order can be paid
// but not shipped, shipped but later refunded, etc. Collapsing the two into
// one field forces impossible states (see the Phase 2 architecture notes).
export const PAYMENT_STATUSES = ['pending', 'paid', 'failed', 'refunded'] as const;
export type PaymentStatus = (typeof PAYMENT_STATUSES)[number];

export const FULFILLMENT_STATUSES = [
  'unfulfilled',
  'processing',
  'shipped',
  'delivered',
  'cancelled',
] as const;
export type FulfillmentStatus = (typeof FULFILLMENT_STATUSES)[number];

// A line item is a full snapshot, not a live reference — `product` is kept
// only for linking back (e.g. "buy again"). Every other field is copied at
// the moment of purchase so a later product rename, repricing, or
// deactivation never rewrites what this order actually was.
@Schema({ _id: false })
export class OrderItem {
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'Product', required: true })
  product!: Types.ObjectId;

  @Prop({ required: true })
  name: string = '';

  @Prop({ required: true })
  slug: string = '';

  @Prop({ required: true })
  color: string = '';

  @Prop({ required: true, enum: PRODUCT_SIZES })
  size!: ProductSize;

  @Prop({ type: String, default: null })
  image: string | null = null;

  // Minor units, at time of purchase.
  @Prop({ required: true, min: 0 })
  unitPrice: number = 0;

  @Prop({ required: true, min: 1 })
  quantity: number = 1;

  @Prop({ required: true, min: 0 })
  lineTotal: number = 0;
}

export const OrderItemSchema = SchemaFactory.createForClass(OrderItem);

// Also a snapshot, not a ref to Address — editing or deleting a saved
// address later must never change where a past order says it was shipped.
@Schema({ _id: false })
export class ShippingAddressSnapshot {
  @Prop({ required: true })
  firstName: string = '';

  @Prop({ required: true })
  lastName: string = '';

  @Prop({ required: true })
  phone: string = '';

  @Prop({ required: true })
  addressLine: string = '';

  @Prop({ required: true })
  city: string = '';

  @Prop({ required: true })
  governorate: string = '';

  @Prop({ type: String, default: null })
  postalCode: string | null = null;
}

export const ShippingAddressSnapshotSchema = SchemaFactory.createForClass(ShippingAddressSnapshot);

export type OrderDocument = HydratedDocument<Order>;

@Schema({ timestamps: true })
export class Order {
  // Human-readable, e.g. "VLT-20260814-0001" — separate from _id because
  // customers and support staff need something they can read aloud.
  @Prop({ required: true, unique: true })
  orderNumber: string = '';

  // Null for guest checkouts. Every order is still fully self-describing
  // without it — the shipping snapshot and guestEmail below carry everything
  // needed to fulfil and contact, so an account is a convenience, not a
  // requirement for buying.
  @Prop({ type: MongooseSchema.Types.ObjectId, ref: 'User', required: false, default: null })
  user: Types.ObjectId | null = null;

  // Contact address for guest orders. For account orders this stays null and
  // the email is read from the linked User instead, so there is exactly one
  // source of truth per order rather than a copy that can drift.
  @Prop({ type: String, default: null, lowercase: true, trim: true })
  guestEmail: string | null = null;

  // Opaque bearer token handed back once, at checkout, so the guest who just
  // ordered can load their confirmation and poll card payment status without
  // an account. Not a substitute for the email lookup — it lives in
  // sessionStorage and dies with the tab.
  @Prop({ type: String, default: null })
  guestAccessToken: string | null = null;

  @Prop({ type: [OrderItemSchema], required: true })
  items: OrderItem[] = [];

  @Prop({ type: ShippingAddressSnapshotSchema, required: true })
  shippingAddress!: ShippingAddressSnapshot;

  // All money fields below are minor units (piastres), same convention as
  // Product — computed server-side only, never accepted from the client.
  @Prop({ required: true, min: 0 })
  subtotal: number = 0;

  @Prop({ required: true, min: 0, default: 0 })
  shippingCost: number = 0;

  @Prop({ required: true, min: 0, default: 0 })
  discountAmount: number = 0;

  @Prop({ type: String, default: null })
  couponCode: string | null = null;

  @Prop({ required: true, min: 0 })
  total: number = 0;

  @Prop({ required: true, default: 'EGP' })
  currency: string = 'EGP';

  @Prop({ required: true, enum: PAYMENT_METHODS, default: 'cod' })
  paymentMethod: PaymentMethod = 'cod';

  @Prop({ required: true, enum: PAYMENT_STATUSES, default: 'pending' })
  paymentStatus: PaymentStatus = 'pending';

  @Prop({ required: true, enum: FULFILLMENT_STATUSES, default: 'unfulfilled' })
  fulfillmentStatus: FulfillmentStatus = 'unfulfilled';

  @Prop({ type: String, default: null })
  trackingNumber: string | null = null;

  // Dedupes retried checkout requests (double-click, client retry after a
  // timeout) — same key returns the original order instead of placing a
  // second one. Sparse+unique: most historical write paths won't set it,
  // but any two orders that do must not collide.
  @Prop({ type: String, default: null })
  idempotencyKey: string | null = null;

  @Prop({ type: String, default: null })
  paymobOrderId: string | null = null;

  @Prop({ type: String, default: null })
  paymobTransactionId: string | null = null;

  // True while this order is holding real inventory. Card orders reserve
  // stock up front (so the customer can't pay for something that sells out
  // mid-payment) and release it again if payment never completes — this flag
  // is what makes releasing exactly-once safe, since it can only flip
  // true -> false once via a conditional update.
  @Prop({ default: false })
  stockReserved: boolean = false;

  // When an unpaid card order's stock reservation lapses. Null for COD
  // (nothing to wait on) and for orders that are already settled.
  @Prop({ type: Date, default: null })
  paymentExpiresAt: Date | null = null;

  createdAt?: Date;
  updatedAt?: Date;
}

export const OrderSchema = SchemaFactory.createForClass(Order);

// The guest token is a credential, not order data. It is handed back exactly
// once — as a separate top-level field on the checkout response — and must
// never ride along on a normal order read, where it would hand a fresh
// bearer credential to anyone who could already see the order once.
OrderSchema.set('toJSON', {
  transform: (_doc, ret) => {
    delete (ret as Partial<Order>).guestAccessToken;
    return ret;
  },
});

OrderSchema.index({ user: 1, createdAt: -1 });
OrderSchema.index({ idempotencyKey: 1 }, { unique: true, sparse: true });

// Backs the "track your order" lookup, which pairs an order number with the
// email that placed it.
OrderSchema.index({ guestEmail: 1, createdAt: -1 });

// Paymob's webhook identifies an order by its Paymob-side id, so this lookup
// happens on every callback.
OrderSchema.index({ paymobOrderId: 1 }, { sparse: true });

// Drives the sweeper that releases stock from abandoned card checkouts.
OrderSchema.index({ paymentStatus: 1, stockReserved: 1, paymentExpiresAt: 1 });
