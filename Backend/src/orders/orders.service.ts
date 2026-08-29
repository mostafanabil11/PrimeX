import { PaymentService } from '@/payment/payment.service';
import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types, FilterQuery } from 'mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { randomUUID } from 'crypto';
import { Order, OrderDocument, PaymentMethod, FulfillmentStatus } from './schemas/order.schema';
import { Counter, CounterDocument } from './schemas/counter.schema';
import { ProductSize } from '@/products/schemas/product-size-stock.schema';
import { CheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { AdminOrderQueryDto } from './dto/admin-order-query.dto';
import { CartService } from '@/cart/cart.service';
import { AddressesService } from '@/addresses/addresses.service';
import { ProductsService, StockLine } from '@/products/products.service';
import { SettingsService } from '@/settings/settings.service';
import { User, UserDocument } from '@/auth/schemas/user.schema';
import { CouponsService, CouponApplication } from '@/coupons/coupons.service';

export interface CreateOrderItemInput {
  productId: string;
  name: string;
  slug: string;
  color: string;
  size: ProductSize;
  image: string | null;
  unitPrice: number;
  quantity: number;
}

export interface ShippingAddressInput {
  firstName: string;
  lastName: string;
  phone: string;
  addressLine: string;
  city: string;
  governorate: string;
  postalCode: string | null;
}

export interface CreateOrderInput {
  // Null for a guest order — guestEmail carries the contact address instead.
  userId: string | null;
  guestEmail?: string | null;
  guestAccessToken?: string | null;
  items: CreateOrderItemInput[];
  shippingAddress: ShippingAddressInput;
  shippingCost: number;
  discountAmount?: number;
  couponCode?: string | null;
  currency: string;
  paymentMethod: PaymentMethod;
  idempotencyKey?: string | null;
  stockReserved?: boolean;
  paymentExpiresAt?: Date | null;
}

// Must stay >= the payment key's own expiry in PaymentService, so the
// reservation never lapses while Paymob would still accept the payment.
const CARD_PAYMENT_WINDOW_MS = 15 * 60 * 1000;

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    @InjectModel(Order.name) private orderModel: Model<OrderDocument>,
    @InjectModel(Counter.name) private counterModel: Model<CounterDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private cartService: CartService,
    private addressesService: AddressesService,
    private productsService: ProductsService,
    private settingsService: SettingsService,
    private eventEmitter: EventEmitter2,
    private paymentService: PaymentService,
    private couponsService: CouponsService
  ) {}

  private async nextOrderNumber(): Promise<string> {
    const now = new Date();
    const dateKey = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const counter = await this.counterModel.findOneAndUpdate(
      { key: `order-${dateKey}` },
      { $inc: { seq: 1 } },
      { upsert: true, new: true }
    );
    return `VLT-${dateKey}-${String(counter.seq).padStart(4, '0')}`;
  }

  // Pure persistence: takes already-resolved, already-priced line items and
  // writes the order. Cart resolution, stock validation/decrement, and
  // payment handling are the caller's job (the checkout endpoint) — this
  // method doesn't re-check any of that, it trusts what it's given the way
  // an internal, non-HTTP-facing method is allowed to.
  async createOrder(input: CreateOrderInput) {
    if (input.idempotencyKey) {
      const existing = await this.orderModel.findOne({ idempotencyKey: input.idempotencyKey });
      if (existing) {
        return { success: true, message: 'Order already placed', data: existing };
      }
    }

    const items = input.items.map(item => ({
      product: new Types.ObjectId(item.productId),
      name: item.name,
      slug: item.slug,
      color: item.color,
      size: item.size,
      image: item.image,
      unitPrice: item.unitPrice,
      quantity: item.quantity,
      lineTotal: item.unitPrice * item.quantity,
    }));

    const subtotal = items.reduce((sum, i) => sum + i.lineTotal, 0);
    const discountAmount = input.discountAmount ?? 0;
    const total = subtotal + input.shippingCost - discountAmount;

    const orderNumber = await this.nextOrderNumber();

    const order = await this.orderModel.create({
      orderNumber,
      user: input.userId,
      guestEmail: input.guestEmail ?? null,
      guestAccessToken: input.guestAccessToken ?? null,
      items,
      shippingAddress: input.shippingAddress,
      subtotal,
      shippingCost: input.shippingCost,
      discountAmount,
      total,
      currency: input.currency,
      couponCode: input.couponCode ?? null,
      paymentMethod: input.paymentMethod,
      paymentStatus: 'pending',
      // COD orders can start being picked immediately — there's no payment to
      // wait on. Card orders stay unfulfilled until the webhook confirms
      // payment, so an unpaid order never reaches the fulfilment queue.
      fulfillmentStatus: input.paymentMethod === 'cod' ? 'processing' : 'unfulfilled',
      idempotencyKey: input.idempotencyKey ?? null,
      stockReserved: input.stockReserved ?? false,
      paymentExpiresAt: input.paymentExpiresAt ?? null,
    });

    return {
      success: true,
      message: 'Order placed successfully',
      data: order,
    };
  }

  // Everything the checkout screen actually needs, in one call: resolves the
  // cart (never trusting client prices — see CartService), blocks if anything
  // about it has drifted since the client last saw it, reserves real stock,
  // snapshots an order, clears the cart, and fires the confirmation email off
  // as an event rather than blocking the response on it.
  //
  // Serves both signed-in and guest checkouts. The only real differences are
  // where the address and cart come from, and who the order is attached to —
  // pricing, stock, coupons, and payment are one shared path, so a guest can
  // never be charged by rules a member wouldn't be.
  async checkout(userId: string | null, dto: CheckoutDto) {
    // Idempotency is checked before any side effect — a retried request
    // with the same key must never re-reserve stock or re-emit the
    // confirmation email, it should just hand back the original order.
    if (dto.idempotencyKey) {
      const existing = await this.orderModel.findOne({
        idempotencyKey: dto.idempotencyKey,
        ...(userId ? { user: userId } : { guestEmail: dto.email?.trim().toLowerCase() }),
      });
      if (existing) {
        return { success: true, message: 'Order already placed', data: existing };
      }
    }

    if (dto.paymentMethod === 'card' && !this.paymentService.isConfigured()) {
      throw new ServiceUnavailableException(
        'Card payment is not available right now. Please choose cash on delivery.'
      );
    }

    // A signed-in customer may still type a one-off address rather than pick
    // a saved one, so the saved-address lookup is keyed on the request
    // carrying an addressId — not merely on the caller being logged in.
    let address: ShippingAddressInput;
    if (dto.addressId) {
      if (!userId) {
        throw new BadRequestException('Sign in to use a saved address');
      }
      const { data: saved } = await this.addressesService.findOne(userId, dto.addressId);
      address = {
        firstName: saved.firstName,
        lastName: saved.lastName,
        phone: saved.phone,
        addressLine: saved.addressLine,
        city: saved.city,
        governorate: saved.governorate,
        postalCode: saved.postalCode,
      };
    } else {
      // Guaranteed present by the DTO's superRefine, which rejects a request
      // carrying neither an addressId nor a full inline address.
      const inline = dto.shippingAddress!;
      address = {
        firstName: inline.firstName,
        lastName: inline.lastName,
        phone: inline.phone,
        addressLine: inline.addressLine,
        city: inline.city,
        governorate: inline.governorate,
        postalCode: inline.postalCode ?? null,
      };
    }

    // Signed-in customers are always priced from their server cart. Guests
    // have nowhere server-side to keep one, so they send their lines and the
    // cart service re-resolves every one against live product data — same
    // function, same prices, same availability rules.
    const { data: cart } = userId
      ? await this.cartService.getCart(userId)
      : await this.cartService.validate(dto.items ?? []);

    if (cart.items.length === 0) {
      throw new BadRequestException('Your cart is empty');
    }
    if (cart.hasChanges || cart.items.some(item => !item.available)) {
      throw new ConflictException(
        'Your cart has changed since you last viewed it — please review it before checking out'
      );
    }

    const { data: settings } = await this.settingsService.getSettings();
    let shippingCost =
      cart.subtotal >= settings.freeShippingThresholdMinorUnits
        ? 0
        : settings.flatShippingRateMinorUnits;

    // Who this order belongs to, in the one shape the coupon layer needs.
    // Guests are capped per email address rather than per account.
    const guestEmail = userId ? null : dto.email!.trim().toLowerCase();
    const redeemer = { userId, email: guestEmail };

    // Re-validated here rather than trusted from an earlier /coupons/validate
    // call — the cart (and the coupon itself) may have changed in between.
    let couponApplication: CouponApplication | null = null;
    if (dto.couponCode) {
      couponApplication = await this.couponsService.resolveCoupon(dto.couponCode, redeemer, cart);
      if (couponApplication.freeShipping) {
        shippingCost = 0;
      }
    }
    const discountAmount = couponApplication?.discountAmount ?? 0;

    // Generated once per checkout attempt even when the client didn't send
    // one, so the stock-ledger reference and the order's own idempotency
    // key stay the same value throughout this call.
    const idempotencyKey = dto.idempotencyKey ?? randomUUID();

    const stockLines: StockLine[] = cart.items.map(item => ({
      productId: item.productId,
      size: item.size,
      quantity: item.quantity,
    }));

    const reservation = await this.productsService.reserveStockForOrder(stockLines, idempotencyKey);
    if (!reservation.success) {
      throw new ConflictException(
        `Size ${reservation.failedLine.size} sold out while you were checking out — please update your cart`
      );
    }

    // Cart items were already confirmed `available` above, so name/slug/
    // color/unitPrice are guaranteed non-null here even though the resolved
    // type allows null for the unavailable case.
    const orderItems: CreateOrderItemInput[] = cart.items.map(item => ({
      productId: item.productId,
      name: item.name!,
      slug: item.slug!,
      color: item.color!,
      size: item.size,
      image: item.image,
      unitPrice: item.unitPrice!,
      quantity: item.quantity,
    }));

    const isCard = dto.paymentMethod === 'card';
    // Card orders hold their reservation only for the payment window; the
    // sweeper releases it if the customer never completes payment.
    const paymentExpiresAt = isCard ? new Date(Date.now() + CARD_PAYMENT_WINDOW_MS) : null;

    // Handed back to the guest exactly once, in the checkout response, so the
    // tab that placed the order can load its confirmation and poll card
    // payment without an account. Members don't need one — their session
    // already proves ownership.
    const guestAccessToken = userId ? null : randomUUID();

    let order;
    try {
      order = await this.createOrder({
        userId,
        guestEmail,
        guestAccessToken,
        items: orderItems,
        shippingAddress: address,
        shippingCost,
        discountAmount,
        couponCode: couponApplication?.coupon.code ?? null,
        currency: settings.currency,
        paymentMethod: dto.paymentMethod,
        idempotencyKey,
        // Stock was decremented just above, so every order created here owns
        // a live reservation until it's either paid (COD: immediately) or
        // released by the sweeper.
        stockReserved: true,
        paymentExpiresAt,
      });
    } catch (err) {
      // Stock was reserved but the order write failed — put it back rather
      // than leaving inventory decremented for an order that doesn't exist.
      for (const line of stockLines) {
        await this.productsService.restoreStock(line.productId, line.size, line.quantity, {
          reason: 'order_rollback',
          reference: idempotencyKey,
        });
      }
      throw err;
    }

    if (couponApplication) {
      try {
        await this.couponsService.reserveRedemption(
          couponApplication.coupon._id,
          redeemer,
          order.data._id,
          discountAmount
        );
      } catch (err) {
        // Lost a race for the coupon's last redemption slot after the order
        // was already written — unwind exactly like the Paymob-session
        // failure below rather than leaving a discounted order with no
        // matching redemption record.
        await this.releaseReservation(order.data, 'order_rollback');
        order.data.paymentStatus = 'failed';
        order.data.fulfillmentStatus = 'cancelled';
        order.data.paymentExpiresAt = null;
        await order.data.save();
        throw err;
      }
    }

    // Contact details for the confirmation email and the payment provider.
    // A guest has no User row, so they come from what was typed at checkout —
    // the shipping name is the only name we have for them.
    const user = userId ? await this.userModel.findById(userId) : null;
    const contactEmail = user?.email ?? guestEmail;
    const contactFirstName = user?.firstName ?? address.firstName;

    if (!isCard) {
      // COD: nothing to settle, so the order is final the moment it's placed.
      // Only members have a server cart to clear; a guest's cart lives in
      // their browser and is cleared client-side once this call succeeds.
      if (userId) {
        await this.cartService.clearInternal(userId);
      }
      if (contactEmail) {
        this.eventEmitter.emit('order.placed', {
          email: contactEmail,
          firstName: contactFirstName,
          order: order.data,
        });
      }
      return this.withGuestToken(order, guestAccessToken);
    }

    // Card: hand back a payment session. The cart is deliberately NOT cleared
    // and no confirmation email is sent yet — both happen in confirmCardPayment
    // once Paymob actually confirms, so an abandoned payment leaves the
    // customer's cart intact to try again.
    try {
      const session = await this.paymentService.createPaymentSession({
        amountCents: order.data.total,
        merchantOrderId: order.data.orderNumber,
        items: this.buildPaymobItems(orderItems, order.data.shippingCost),
        billingData: {
          first_name: address.firstName,
          last_name: address.lastName,
          phone_number: address.phone,
          email: contactEmail ?? 'unknown@valiant.local',
          street: address.addressLine,
          city: address.city,
          state: address.governorate,
          country: 'EG',
          postal_code: address.postalCode || 'NA',
          apartment: 'NA',
          floor: 'NA',
          building: 'NA',
          shipping_method: 'PKG',
        },
      });

      order.data.paymobOrderId = session.paymobOrderId;
      await order.data.save();

      return {
        success: true,
        message: 'Order created — complete payment to confirm',
        data: order.data,
        guestAccessToken,
        payment: {
          iframeUrl: session.iframeUrl,
          expiresAt: paymentExpiresAt!.toISOString(),
        },
      };
    } catch (err) {
      // Paymob is unreachable/misconfigured. The order exists but can never be
      // paid, so release its stock and mark it failed rather than leaving a
      // zombie order silently holding inventory until the sweeper notices.
      await this.releaseReservation(order.data, 'order_rollback');
      await this.couponsService.releaseRedemption(order.data._id);
      order.data.paymentStatus = 'failed';
      order.data.fulfillmentStatus = 'cancelled';
      order.data.paymentExpiresAt = null;
      await order.data.save();
      throw err;
    }
  }

  // The token is deliberately surfaced only in the checkout response, never
  // on any later read of the order — it is a one-time handoff to the tab that
  // placed the order, not a field of the order itself.
  private withGuestToken<T extends object>(result: T, guestAccessToken: string | null) {
    return guestAccessToken ? { ...result, guestAccessToken } : result;
  }

  // Reads one order for a caller who may be a member (session proves it),
  // the guest who just placed it (token proves it), or someone doing a
  // track-my-order lookup (order number + matching email proves it).
  //
  // Every branch ends in the same place: an order is only returned to someone
  // who has already demonstrated they know something private about it.
  async findOneForViewer(
    orderNumber: string,
    viewer: { userId?: string | null; guestAccessToken?: string | null; email?: string | null }
  ) {
    const order = await this.orderModel.findOne({ orderNumber });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (viewer.userId && order.user?.toString() === viewer.userId) {
      return { success: true, message: 'Order retrieved successfully', data: order };
    }

    // Constant-time-ish comparison isn't warranted here (the token is a v4
    // UUID and the lookup is already order-number-scoped), but an empty or
    // null token must never match an order that doesn't have one.
    if (
      viewer.guestAccessToken &&
      order.guestAccessToken &&
      order.guestAccessToken === viewer.guestAccessToken
    ) {
      return { success: true, message: 'Order retrieved successfully', data: order };
    }

    if (viewer.email) {
      const email = viewer.email.trim().toLowerCase();
      const ownerEmail =
        order.guestEmail ??
        (order.user ? (await this.userModel.findById(order.user))?.email?.toLowerCase() : null);
      if (ownerEmail && ownerEmail === email) {
        return { success: true, message: 'Order retrieved successfully', data: order };
      }
    }

    // Deliberately the same error as a genuinely missing order — telling an
    // anonymous caller that an order number exists but isn't theirs would let
    // them enumerate real order numbers.
    throw new NotFoundException('Order not found');
  }

  // Paymob rejects an order whose line items don't add up to the amount it's
  // being asked to charge, so shipping has to appear as its own line.
  private buildPaymobItems(items: CreateOrderItemInput[], shippingCost: number) {
    const lines = items.map(item => ({
      name: `${item.name} (${item.color}, ${item.size})`.slice(0, 100),
      amount_cents: item.unitPrice,
      quantity: item.quantity,
    }));

    if (shippingCost > 0) {
      lines.push({ name: 'Shipping', amount_cents: shippingCost, quantity: 1 });
    }

    return lines;
  }

  // Flips stockReserved true -> false and puts the inventory back, exactly
  // once. The conditional update is the guard: two concurrent callers (say a
  // webhook retry racing the sweeper) can't both win, so stock can never be
  // restored twice for one order.
  private async releaseReservation(
    order: OrderDocument,
    reason: 'order_cancelled' | 'order_rollback'
  ): Promise<boolean> {
    const claimed = await this.orderModel.updateOne(
      { _id: order._id, stockReserved: true },
      { $set: { stockReserved: false } }
    );
    if (claimed.modifiedCount !== 1) {
      return false;
    }

    for (const item of order.items) {
      await this.productsService.restoreStock(item.product.toString(), item.size, item.quantity, {
        reason,
        reference: order.orderNumber,
      });
    }
    order.stockReserved = false;
    return true;
  }

  // Called by the Paymob webhook once a transaction is reported successful.
  // Must be safe to call repeatedly: Paymob retries webhooks, and the browser
  // redirect can arrive alongside the server-to-server callback.
  async confirmCardPayment(params: {
    paymobOrderId: string;
    transactionId: string;
    amountCents: number;
  }): Promise<'confirmed' | 'already_confirmed' | 'not_found' | 'amount_mismatch'> {
    const order = await this.orderModel.findOne({ paymobOrderId: params.paymobOrderId });
    if (!order) {
      this.logger.warn(`Paymob callback for unknown order ${params.paymobOrderId}`);
      return 'not_found';
    }

    if (order.paymentStatus === 'paid') {
      return 'already_confirmed';
    }

    // The amount is signed by the HMAC, so a mismatch means our own records
    // disagree with what was charged — never auto-confirm that.
    if (params.amountCents !== order.total) {
      this.logger.error(
        `Paymob amount mismatch on ${order.orderNumber}: charged ${params.amountCents}, expected ${order.total}`
      );
      return 'amount_mismatch';
    }

    // Claim the transition atomically so two concurrent callbacks can't both
    // proceed to send a confirmation email.
    const claimed = await this.orderModel.updateOne(
      { _id: order._id, paymentStatus: 'pending' },
      {
        $set: {
          paymentStatus: 'paid',
          fulfillmentStatus: 'processing',
          paymobTransactionId: params.transactionId,
          paymentExpiresAt: null,
        },
      }
    );
    if (claimed.modifiedCount !== 1) {
      return 'already_confirmed';
    }

    order.paymentStatus = 'paid';
    order.fulfillmentStatus = 'processing';
    order.paymobTransactionId = params.transactionId;
    order.paymentExpiresAt = null;

    // Stock was already reserved at checkout; payment converts that
    // reservation into a real sale, so it simply stays held.
    //
    // Only a member has a server cart to empty. A guest's cart lives in their
    // browser — it is cleared when the confirmation page loads, since the
    // webhook has no way to reach back into their session.
    if (order.user) {
      await this.cartService.clearInternal(order.user.toString());
    }

    const user = order.user ? await this.userModel.findById(order.user) : null;
    const contactEmail = user?.email ?? order.guestEmail;
    if (contactEmail) {
      this.eventEmitter.emit('order.placed', {
        email: contactEmail,
        firstName: user?.firstName ?? order.shippingAddress.firstName,
        order,
      });
    }

    this.logger.log(`Payment confirmed for ${order.orderNumber} (txn ${params.transactionId})`);
    return 'confirmed';
  }

  async findOrderNumberByPaymobId(paymobOrderId: string): Promise<string | null> {
    const order = await this.orderModel.findOne({ paymobOrderId }).select('orderNumber');
    return order?.orderNumber ?? null;
  }

  async failCardPayment(paymobOrderId: string, transactionId?: string): Promise<void> {
    const order = await this.orderModel.findOne({ paymobOrderId });
    if (!order || order.paymentStatus === 'paid') {
      // Never downgrade an already-paid order on a late failure callback.
      return;
    }

    await this.releaseReservation(order, 'order_cancelled');
    await this.couponsService.releaseRedemption(order._id);

    await this.orderModel.updateOne(
      { _id: order._id, paymentStatus: 'pending' },
      {
        $set: {
          paymentStatus: 'failed',
          fulfillmentStatus: 'cancelled',
          paymentExpiresAt: null,
          ...(transactionId ? { paymobTransactionId: transactionId } : {}),
        },
      }
    );

    this.logger.log(`Payment failed for ${order.orderNumber} — stock released`);
  }

  // Sweeper: releases inventory held by card checkouts that were never paid.
  // Without this, closing the tab on the payment step would hold stock forever.
  async releaseExpiredCardOrders(): Promise<number> {
    const expired = await this.orderModel.find({
      paymentMethod: 'card',
      paymentStatus: 'pending',
      stockReserved: true,
      paymentExpiresAt: { $ne: null, $lt: new Date() },
    });

    let released = 0;
    for (const order of expired) {
      const didRelease = await this.releaseReservation(order, 'order_cancelled');
      if (didRelease) {
        await this.couponsService.releaseRedemption(order._id);
        await this.orderModel.updateOne(
          { _id: order._id, paymentStatus: 'pending' },
          {
            $set: {
              paymentStatus: 'failed',
              fulfillmentStatus: 'cancelled',
              paymentExpiresAt: null,
            },
          }
        );
        released += 1;
        this.logger.log(`Released expired card reservation for ${order.orderNumber}`);
      }
    }

    return released;
  }

  // Customer self-service cancellation. Deliberately scoped to orders that
  // haven't been paid yet (COD awaiting delivery, or a card order still
  // mid-checkout) — once paymentStatus is 'paid', real money has been
  // captured and reversing that needs an actual refund through Paymob, which
  // is an admin action, not a one-click customer button. That keeps this
  // safe: nothing here ever promises a refund it can't deliver.
  // Ownership is proved the same way it is for reading an order: a session
  // for members, the one-time token for the guest who placed it. A guest who
  // can see their order can also back out of it, exactly like a member.
  async cancelOrder(
    viewer: { userId?: string | null; guestAccessToken?: string | null },
    orderNumber: string
  ) {
    const { data: order } = await this.findOneForViewer(orderNumber, viewer);

    const cancellableFulfillment: FulfillmentStatus[] = ['unfulfilled', 'processing'];
    if (
      order.paymentStatus !== 'pending' ||
      !cancellableFulfillment.includes(order.fulfillmentStatus)
    ) {
      throw new ConflictException(
        'This order can no longer be cancelled — contact support if you need to make changes'
      );
    }

    // Conditional update is the guard: two concurrent cancel clicks (or a
    // cancel racing the expiry sweeper/webhook) can't both win.
    const claimed = await this.orderModel.updateOne(
      {
        _id: order._id,
        paymentStatus: 'pending',
        fulfillmentStatus: { $in: cancellableFulfillment },
      },
      { $set: { fulfillmentStatus: 'cancelled', paymentExpiresAt: null } }
    );
    if (claimed.modifiedCount !== 1) {
      throw new ConflictException('This order can no longer be cancelled');
    }

    if (order.stockReserved) {
      await this.releaseReservation(order, 'order_cancelled');
    }
    await this.couponsService.releaseRedemption(order._id);

    // Same contact resolution as checkout: the account when there is one,
    // otherwise what the guest gave us at the till.
    const owner = order.user ? await this.userModel.findById(order.user) : null;
    const contactEmail = owner?.email ?? order.guestEmail;
    if (contactEmail) {
      this.eventEmitter.emit('order.cancelled', {
        email: contactEmail,
        firstName: owner?.firstName ?? order.shippingAddress.firstName,
        order,
      });
    }

    this.logger.log(`Order ${order.orderNumber} cancelled by customer`);

    const updated = await this.orderModel.findById(order._id);
    return { success: true, message: 'Order cancelled', data: updated };
  }

  // Admin-only fulfillment/payment transitions. There's no admin panel yet
  // (that's Phase 6) — this one guarded endpoint exists now because the
  // shipped/delivered/refunded emails required by this phase are otherwise
  // unreachable: nothing else in the codebase ever moves an order past
  // "processing".
  async updateOrderStatus(orderNumber: string, dto: UpdateOrderStatusDto) {
    const order = await this.orderModel.findOne({ orderNumber });
    if (!order) {
      throw new NotFoundException('Order not found');
    }

    if (dto.fulfillmentStatus === 'shipped') {
      if (!['unfulfilled', 'processing'].includes(order.fulfillmentStatus)) {
        throw new ConflictException(`Cannot mark a ${order.fulfillmentStatus} order as shipped`);
      }
      // Cash-on-delivery ships unpaid by design (the courier collects
      // payment on delivery) — only a card order must actually be paid first.
      if (order.paymentMethod === 'card' && order.paymentStatus !== 'paid') {
        throw new ConflictException('Cannot ship an unpaid card order');
      }

      const claimed = await this.orderModel.updateOne(
        { _id: order._id, fulfillmentStatus: order.fulfillmentStatus },
        {
          $set: {
            fulfillmentStatus: 'shipped',
            ...(dto.trackingNumber ? { trackingNumber: dto.trackingNumber } : {}),
          },
        }
      );
      if (claimed.modifiedCount !== 1) {
        throw new ConflictException('This order was updated by someone else — please retry');
      }

      const user = await this.userModel.findById(order.user);
      const updated = await this.orderModel.findById(order._id);
      if (user && updated) {
        this.eventEmitter.emit('order.shipped', {
          email: user.email,
          firstName: user.firstName,
          order: updated,
        });
      }
      return { success: true, message: 'Order marked as shipped', data: updated };
    }

    if (dto.fulfillmentStatus === 'delivered') {
      if (order.fulfillmentStatus !== 'shipped') {
        throw new ConflictException('An order must be shipped before it can be marked delivered');
      }

      // COD collects payment at the door — delivery is the moment it's
      // actually settled, so this is where paymentStatus finally flips.
      const settlesCod = order.paymentMethod === 'cod' && order.paymentStatus === 'pending';
      const claimed = await this.orderModel.updateOne(
        { _id: order._id, fulfillmentStatus: 'shipped' },
        {
          $set: {
            fulfillmentStatus: 'delivered',
            ...(settlesCod ? { paymentStatus: 'paid' } : {}),
            ...(dto.trackingNumber ? { trackingNumber: dto.trackingNumber } : {}),
          },
        }
      );
      if (claimed.modifiedCount !== 1) {
        throw new ConflictException('This order was updated by someone else — please retry');
      }

      const user = await this.userModel.findById(order.user);
      const updated = await this.orderModel.findById(order._id);
      if (user && updated) {
        this.eventEmitter.emit('order.delivered', {
          email: user.email,
          firstName: user.firstName,
          order: updated,
        });
      }
      return { success: true, message: 'Order marked as delivered', data: updated };
    }

    if (dto.paymentStatus === 'refunded') {
      if (order.paymentStatus !== 'paid') {
        throw new ConflictException('Only a paid order can be refunded');
      }

      // A refund doesn't automatically restock the item — that's a separate
      // judgment call (condition of the return, restocking fee, etc.), so
      // stockReserved is left exactly as it is.
      const claimed = await this.orderModel.updateOne(
        { _id: order._id, paymentStatus: 'paid' },
        { $set: { paymentStatus: 'refunded' } }
      );
      if (claimed.modifiedCount !== 1) {
        throw new ConflictException('This order was updated by someone else — please retry');
      }

      const user = await this.userModel.findById(order.user);
      const updated = await this.orderModel.findById(order._id);
      if (user && updated) {
        this.eventEmitter.emit('order.refunded', {
          email: user.email,
          firstName: user.firstName,
          order: updated,
        });
      }
      return { success: true, message: 'Order marked as refunded', data: updated };
    }

    throw new BadRequestException('No valid status transition provided');
  }

  // Lets the checkout page poll for the outcome instead of trusting the
  // browser redirect, which can be lost if the customer closes the tab.
  // Polled from the checkout page while a card payment is in flight, by
  // members and guests alike — so ownership is proved the same way a full
  // order read proves it, rather than assuming a session.
  async getPaymentStatus(
    viewer: { userId?: string | null; guestAccessToken?: string | null },
    orderNumber: string
  ) {
    const { data: order } = await this.findOneForViewer(orderNumber, viewer);

    return {
      success: true,
      message: 'Payment status retrieved',
      data: {
        orderNumber: order.orderNumber,
        paymentStatus: order.paymentStatus,
        fulfillmentStatus: order.fulfillmentStatus,
        expiresAt: order.paymentExpiresAt,
      },
    };
  }

  async findAllForUser(userId: string) {
    const orders = await this.orderModel
      .find({ user: userId })
      .select('orderNumber items total currency paymentStatus fulfillmentStatus createdAt')
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: 'Orders retrieved successfully',
      data: orders,
    };
  }

  // Admin fulfillment queue: every user's orders, filterable by either
  // status dimension, newest first. Unlike findAllForUser this has no
  // ownership filter — access to it is what @Roles('admin') on the route is
  // for, not a query-level scope.
  async findAllAdmin(query: AdminOrderQueryDto) {
    const filter: FilterQuery<OrderDocument> = {};
    if (query.paymentStatus) filter.paymentStatus = query.paymentStatus;
    if (query.fulfillmentStatus) filter.fulfillmentStatus = query.fulfillmentStatus;

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;

    const [items, total] = await Promise.all([
      this.orderModel
        .find(filter)
        .select(
          'orderNumber user items total currency paymentMethod paymentStatus fulfillmentStatus trackingNumber createdAt'
        )
        .populate('user', 'firstName lastName email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit),
      this.orderModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Orders retrieved successfully',
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // Same record findOneForViewer returns, but not ownership-scoped — for the
  // admin order detail view.
  async findOneAdmin(orderNumber: string) {
    const order = await this.orderModel
      .findOne({ orderNumber })
      .populate('user', 'firstName lastName email');
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    return {
      success: true,
      message: 'Order retrieved successfully',
      data: order,
    };
  }
}
