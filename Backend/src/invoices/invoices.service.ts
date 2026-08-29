import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Invoice, InvoiceDocument, InvoiceLine, PaymentMethod } from './schemas/invoice.schema';
import { Counter, CounterDocument } from '@/orders/schemas/counter.schema';
import { Subscription, SubscriptionDocument } from '@/subscriptions/schemas/subscription.schema';

// How long an unpaid card invoice is left alone before the sweeper closes it.
// Matches the Paymob payment window: once the payment key has expired the
// member cannot complete that session anyway, and leaving it pending only
// makes the join flow refuse to start a new one.
const CARD_INVOICE_TTL_MS = 20 * 60 * 1000;

export type ConfirmResult = 'confirmed' | 'already_confirmed' | 'not_found' | 'amount_mismatch';

@Injectable()
export class InvoicesService {
  private readonly logger = new Logger(InvoicesService.name);

  constructor(
    @InjectModel(Invoice.name) private invoiceModel: Model<InvoiceDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    // Read-only, and registered locally rather than by importing
    // SubscriptionsModule: that module already depends on this one, and the
    // only thing needed here is resolving a reference code to an id for the
    // admin search. Same aggregation-for-a-screen pattern AdminModule uses.
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private events: EventEmitter2
  ) {}

  private toObjectId(id: string, label = 'invoice'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label} id`);
    }
    return new Types.ObjectId(id);
  }

  // Reuses the storefront's Counter collection — a generic atomic sequence
  // store, keyed per day. A single findOneAndUpdate with $inc is atomic in
  // Mongo, so two invoices raised in the same millisecond still get distinct
  // numbers without any application-level locking.
  private async nextInvoiceNumber(): Promise<string> {
    const dateKey = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const counter = await this.counterModel.findOneAndUpdate(
      { key: `invoice-${dateKey}` },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    return `INV-${dateKey}-${String(counter.seq).padStart(4, '0')}`;
  }

  /**
   * Raises an invoice.
   *
   * Idempotent on the caller's key: a double-submitted join returns the
   * invoice it already created rather than raising a second one and charging
   * twice. The unique partial index is the real guarantee — this check just
   * turns the race into a clean answer instead of a duplicate-key error.
   */
  async create(input: {
    memberId: string;
    // Null for a walk-in or a reservation made without one. The invoice is
    // still valid and still counts as revenue — it simply cannot be emailed.
    email: string | null;
    phone?: string | null;
    lines: Omit<InvoiceLine, 'lineTotalMinorUnits'>[];
    discountMinorUnits?: number;
    taxRateBasisPoints?: number;
    couponCode?: string | null;
    offerName?: string | null;
    paymentMethod: PaymentMethod;
    subscriptionId?: string | null;
    idempotencyKey?: string | null;
  }): Promise<InvoiceDocument> {
    if (input.idempotencyKey) {
      const existing = await this.invoiceModel.findOne({ idempotencyKey: input.idempotencyKey });
      if (existing) {
        return existing;
      }
    }

    const lines = input.lines.map(line => ({
      ...line,
      lineTotalMinorUnits: line.unitPriceMinorUnits * line.quantity,
    }));

    const subtotal = lines.reduce((sum, l) => sum + l.lineTotalMinorUnits, 0);
    const discount = Math.min(input.discountMinorUnits ?? 0, subtotal);
    const taxable = subtotal - discount;
    // Integer arithmetic throughout, rounded once at the end — the whole
    // reason money is stored in minor units.
    const tax = Math.round((taxable * (input.taxRateBasisPoints ?? 0)) / 10000);

    try {
      return await this.invoiceModel.create({
        invoiceNumber: await this.nextInvoiceNumber(),
        member: this.toObjectId(input.memberId, 'member'),
        email: input.email,
        phone: input.phone ?? null,
        lines,
        subtotalMinorUnits: subtotal,
        discountMinorUnits: discount,
        taxMinorUnits: tax,
        totalMinorUnits: taxable + tax,
        couponCode: input.couponCode ?? null,
        offerName: input.offerName ?? null,
        paymentMethod: input.paymentMethod,
        paymentStatus: 'pending',
        subscription: input.subscriptionId ? this.toObjectId(input.subscriptionId) : null,
        idempotencyKey: input.idempotencyKey ?? null,
      });
    } catch (err) {
      // Lost the race on the unique index: the other request created it, so
      // return that rather than failing a join the member did complete.
      if ((err as { code?: number }).code === 11000 && input.idempotencyKey) {
        const existing = await this.invoiceModel.findOne({
          idempotencyKey: input.idempotencyKey,
        });
        if (existing) {
          return existing;
        }
      }
      throw err;
    }
  }

  async attachPaymobOrder(invoiceId: Types.ObjectId, paymobOrderId: string): Promise<void> {
    await this.invoiceModel.updateOne({ _id: invoiceId }, { $set: { paymobOrderId } });
  }

  async attachSubscription(
    invoiceId: Types.ObjectId,
    subscriptionId: Types.ObjectId
  ): Promise<void> {
    await this.invoiceModel.updateOne(
      { _id: invoiceId },
      { $set: { subscription: subscriptionId } }
    );
  }

  /**
   * Settles a card invoice from a Paymob callback.
   *
   * The conditional update is what makes a duplicate webhook harmless: only a
   * still-pending invoice matches, so the second delivery finds nothing to
   * change and reports already_confirmed rather than emitting a second
   * activation event.
   */
  async confirmCardPayment(params: {
    paymobOrderId: string;
    transactionId: string;
    amountCents: number;
  }): Promise<ConfirmResult> {
    const invoice = await this.invoiceModel.findOne({ paymobOrderId: params.paymobOrderId });
    if (!invoice) {
      return 'not_found';
    }

    if (invoice.paymentStatus === 'paid') {
      return 'already_confirmed';
    }

    // Paymob reports what it actually charged. If that is not what we asked
    // for, something is wrong enough that activating a membership on the
    // strength of it would be worse than refusing.
    if (params.amountCents !== invoice.totalMinorUnits) {
      this.logger.error(
        `Invoice ${invoice.invoiceNumber}: Paymob reported ${params.amountCents} but the invoice is ${invoice.totalMinorUnits}`
      );
      return 'amount_mismatch';
    }

    const updated = await this.invoiceModel.findOneAndUpdate(
      { _id: invoice._id, paymentStatus: 'pending' },
      {
        $set: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          paymobTransactionId: params.transactionId,
        },
      },
      { new: true }
    );

    if (!updated) {
      return 'already_confirmed';
    }

    this.events.emit('invoice.paid', {
      invoiceId: (updated._id as Types.ObjectId).toString(),
      subscriptionId: updated.subscription?.toString() ?? null,
      memberId: updated.member.toString(),
      invoiceNumber: updated.invoiceNumber,
    });

    return 'confirmed';
  }

  async failCardPayment(paymobOrderId: string, transactionId?: string): Promise<boolean> {
    const updated = await this.invoiceModel.findOneAndUpdate(
      { paymobOrderId, paymentStatus: 'pending' },
      {
        $set: {
          paymentStatus: 'failed',
          paymobTransactionId: transactionId ?? null,
        },
      },
      { new: true }
    );

    if (updated) {
      this.events.emit('invoice.failed', {
        invoiceId: (updated._id as Types.ObjectId).toString(),
        subscriptionId: updated.subscription?.toString() ?? null,
      });
    }

    return Boolean(updated);
  }

  /** Used by the payment controller to route a callback to the right module. */
  async existsForPaymobOrder(paymobOrderId: string): Promise<boolean> {
    return Boolean(await this.invoiceModel.exists({ paymobOrderId }));
  }

  /**
   * The unsettled invoice raised against a subscription.
   *
   * Used when someone revisits a reservation they already made: the pending
   * subscription and its invoice are handed back as they are, so a second
   * submit does not raise a second bill against the same membership.
   */
  async findPendingForSubscription(
    subscriptionId: Types.ObjectId
  ): Promise<InvoiceDocument | null> {
    return this.invoiceModel.findOne({ subscription: subscriptionId, paymentStatus: 'pending' });
  }

  async findInvoiceNumberByPaymobId(paymobOrderId: string): Promise<string | null> {
    const invoice = await this.invoiceModel.findOne({ paymobOrderId }).select('invoiceNumber');
    return invoice?.invoiceNumber ?? null;
  }

  /**
   * Records a cash payment taken at the desk.
   *
   * Kept separate from confirmCardPayment rather than sharing a "mark paid"
   * method, because this one is a human action that has to be attributable —
   * receivedBy is the only record of which staff member took the money.
   */
  async recordCashPayment(invoiceId: string, staffId: string) {
    const invoice = await this.invoiceModel.findById(this.toObjectId(invoiceId));
    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }
    if (invoice.paymentStatus === 'paid') {
      throw new ConflictException('This invoice has already been paid');
    }

    const updated = await this.invoiceModel.findOneAndUpdate(
      { _id: invoice._id, paymentStatus: { $ne: 'paid' } },
      {
        $set: {
          paymentStatus: 'paid',
          paidAt: new Date(),
          receivedBy: this.toObjectId(staffId, 'user'),
        },
      },
      { new: true }
    );

    if (!updated) {
      throw new ConflictException('This invoice has already been paid');
    }

    this.events.emit('invoice.paid', {
      invoiceId: (updated._id as Types.ObjectId).toString(),
      subscriptionId: updated.subscription?.toString() ?? null,
      memberId: updated.member.toString(),
      invoiceNumber: updated.invoiceNumber,
    });

    return {
      success: true,
      message: 'Payment recorded',
      data: updated,
    };
  }

  async findAllForMember(memberId: string) {
    const invoices = await this.invoiceModel
      .find({ member: this.toObjectId(memberId, 'member') })
      .sort({ createdAt: -1 })
      .lean();

    return {
      success: true,
      message: 'Invoices retrieved successfully',
      data: invoices,
    };
  }

  // Scoped to the owner rather than looked up by id alone: an invoice is a
  // financial record with a name and an email on it.
  async findOneForMember(invoiceNumber: string, memberId: string) {
    const invoice = await this.invoiceModel
      .findOne({ invoiceNumber, member: this.toObjectId(memberId, 'member') })
      .lean();

    if (!invoice) {
      throw new NotFoundException('Invoice not found');
    }

    return {
      success: true,
      message: 'Invoice retrieved successfully',
      data: invoice,
    };
  }

  async findAllAdmin(query: {
    status?: string;
    member?: string;
    q?: string;
    page?: number;
    limit?: number;
  }) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 25;
    const filter: Record<string, unknown> = {};
    if (query.status) {
      filter.paymentStatus = query.status;
    }
    if (query.member) {
      filter.member = this.toObjectId(query.member, 'member');
    }

    // Staff pasting something out of a WhatsApp thread — either the short
    // reference code or a full invoice number.
    //
    // The reference lives on the subscription, and $lookup cannot be filtered
    // through .populate(), so the code is resolved to a subscription id first
    // and that becomes the filter. Anything else is treated as an invoice
    // number, case-insensitively, since nobody types INV- in caps.
    if (query.q?.trim()) {
      const term = query.q.trim();
      const asReference = term.toUpperCase();

      const subscription = await this.subscriptionModel
        .findOne({ referenceCode: asReference })
        .select('_id')
        .lean();

      if (subscription) {
        filter.subscription = subscription._id;
      } else {
        filter.invoiceNumber = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
      }
    }

    const [invoices, total, paidTotal, pendingTotal] = await Promise.all([
      this.invoiceModel
        .find(filter)
        .sort({ createdAt: -1 })
        .skip((page - 1) * limit)
        .limit(limit)
        .populate('member', 'firstName lastName email phone memberNumber')
        // The reference code and where the membership came from are what make
        // a row matchable against a chat, so they travel with the invoice.
        .populate('subscription', 'referenceCode origin status startsAt endsAt planSnapshot.name')
        .lean(),
      this.invoiceModel.countDocuments(filter),
      this.invoiceModel.aggregate<{ total: number }>([
        { $match: { paymentStatus: 'paid' } },
        { $group: { _id: null, total: { $sum: '$totalMinorUnits' } } },
      ]),
      // Across everything, not just this page — the old screen counted the
      // current page and had to caveat itself with "on this page", which is
      // not a number anyone can act on.
      this.invoiceModel.aggregate<{ total: number; count: number }>([
        { $match: { paymentStatus: 'pending' } },
        { $group: { _id: null, total: { $sum: '$totalMinorUnits' }, count: { $sum: 1 } } },
      ]),
    ]);

    return {
      success: true,
      message: 'Invoices retrieved successfully',
      data: {
        invoices,
        total,
        paidTotalMinorUnits: paidTotal[0]?.total ?? 0,
        pendingTotalMinorUnits: pendingTotal[0]?.total ?? 0,
        pendingCount: pendingTotal[0]?.count ?? 0,
        page,
        limit,
        totalPages: Math.max(1, Math.ceil(total / limit)),
      },
    };
  }

  /**
   * Closes card invoices whose payment window has passed.
   *
   * Without this, an abandoned join leaves a pending invoice and a pending
   * subscription forever, and the member is told they already have one in
   * progress every time they try again.
   */
  async failExpiredCardInvoices(): Promise<number> {
    const cutoff = new Date(Date.now() - CARD_INVOICE_TTL_MS);

    const stale = await this.invoiceModel.find({
      paymentMethod: 'card',
      paymentStatus: 'pending',
      createdAt: { $lt: cutoff },
    });

    for (const invoice of stale) {
      await this.invoiceModel.updateOne(
        { _id: invoice._id, paymentStatus: 'pending' },
        { $set: { paymentStatus: 'failed' } }
      );
      this.events.emit('invoice.failed', {
        invoiceId: (invoice._id as Types.ObjectId).toString(),
        subscriptionId: invoice.subscription?.toString() ?? null,
      });
    }

    if (stale.length > 0) {
      this.logger.log(`Closed ${stale.length} abandoned card invoice(s)`);
    }
    return stale.length;
  }
}
