import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Coupon, CouponDocument } from './schemas/coupon.schema';
import { CouponRedemption, CouponRedemptionDocument } from './schemas/coupon-redemption.schema';
import { CreateCouponDto } from './dto/create-coupon.dto';
import { UpdateCouponDto } from './dto/update-coupon.dto';
import { ResolvedCart, ResolvedCartLine } from '@/cart/cart.service';

export interface CouponApplication {
  coupon: CouponDocument;
  discountAmount: number;
  freeShipping: boolean;
}

// Who is redeeming: a signed-in user, or a guest identified only by the email
// they typed at checkout. Per-person limits are enforced against whichever
// one is present.
export interface CouponRedeemer {
  userId: string | null;
  email?: string | null;
}

@Injectable()
export class CouponsService {
  constructor(
    @InjectModel(Coupon.name) private couponModel: Model<CouponDocument>,
    @InjectModel(CouponRedemption.name) private redemptionModel: Model<CouponRedemptionDocument>
  ) {}

  // The identity half of a redemption row — a user ref for accounts, a
  // normalised email for guests. Kept in one place so the "already used"
  // lookup and the row that gets written can never disagree about who this is.
  //
  // Null when the caller is anonymous and hasn't given an email yet, which
  // happens on the cart page before checkout. Callers decide what that means:
  // a preview tolerates it, committing a redemption does not.
  private redemptionIdentity(
    redeemer: CouponRedeemer
  ): { user: string } | { guestEmail: string } | null {
    if (redeemer.userId) {
      return { user: redeemer.userId };
    }
    if (redeemer.email) {
      return { guestEmail: redeemer.email.trim().toLowerCase() };
    }
    return null;
  }

  /**
   * The checks that are true of any coupon regardless of what it is being
   * spent on: it exists, it is live, it is in date, it has uses left, this
   * person has not already used it, and it is allowed on this half of the
   * business.
   *
   * Extracted so the membership path cannot drift out of step with the shop
   * path on any of them — the eligibility rules differ, the validity rules
   * must not.
   */
  private async assertUsable(
    rawCode: string,
    redeemer: CouponRedeemer,
    scope: 'shop' | 'membership'
  ): Promise<CouponDocument> {
    const code = rawCode.trim().toUpperCase();
    const coupon = await this.couponModel.findOne({ code });
    if (!coupon || !coupon.isActive) {
      throw new NotFoundException('That coupon code is not valid');
    }

    // Documents created before scope existed have no value for it, and every
    // one of those was made for the storefront — so absent reads as 'shop'
    // rather than as permission. Mongoose defaults only apply on insert, so
    // without this every legacy coupon would stop working the day this
    // shipped.
    const couponScope = coupon.scope ?? 'shop';
    if (couponScope !== 'both' && couponScope !== scope) {
      // Deliberately the same message as an unknown code. Telling someone a
      // code is real but not for them invites probing for one that is.
      throw new NotFoundException('That coupon code is not valid');
    }

    const now = new Date();
    if (coupon.startsAt && now < coupon.startsAt) {
      throw new BadRequestException('This coupon is not active yet');
    }
    if (coupon.endsAt && now > coupon.endsAt) {
      throw new BadRequestException('This coupon has expired');
    }
    if (coupon.usageLimit !== null && coupon.usedCount >= coupon.usageLimit) {
      throw new BadRequestException('This coupon has reached its usage limit');
    }

    // An anonymous preview (no account, no email yet) cannot be checked
    // against past redemptions. The same check runs again at the point of
    // purchase, by which point an identity is always known, so nothing slips
    // through — the customer just learns about it a step later.
    const identity = this.redemptionIdentity(redeemer);
    if (identity) {
      const alreadyUsed = await this.redemptionModel.exists({ coupon: coupon._id, ...identity });
      if (alreadyUsed) {
        throw new BadRequestException("You've already used this coupon");
      }
    }

    return coupon;
  }

  /**
   * The membership equivalent of resolveCoupon.
   *
   * Separate rather than shared because eligibility genuinely differs: the
   * shop filters line items by product and category, and a membership has
   * neither. Free-shipping coupons are rejected outright — there is nothing
   * to ship.
   */
  async resolveForMembership(
    rawCode: string,
    redeemer: CouponRedeemer,
    context: { subtotal: number; planId: Types.ObjectId }
  ): Promise<CouponApplication> {
    const coupon = await this.assertUsable(rawCode, redeemer, 'membership');

    if (coupon.type === 'free_shipping') {
      throw new BadRequestException('That coupon cannot be used on a membership');
    }

    if (
      coupon.plans.length > 0 &&
      !coupon.plans.some(id => id.toString() === context.planId.toString())
    ) {
      throw new BadRequestException('This coupon does not apply to the plan you have chosen');
    }

    if (context.subtotal < coupon.minSubtotal) {
      throw new BadRequestException('This coupon needs a higher total than the plan you chose');
    }

    const discountAmount =
      coupon.type === 'percentage'
        ? Math.min(
            Math.round((context.subtotal * coupon.value) / 100),
            coupon.maxDiscountCap ?? Number.MAX_SAFE_INTEGER
          )
        : Math.min(coupon.value, context.subtotal);

    return { coupon, discountAmount, freeShipping: false };
  }

  // Read-only: checks eligibility and computes what the discount *would* be
  // against the caller's own already-resolved server cart. No side effects —
  // callable freely for a live preview, and called again (not trusted from
  // the first call) right before an order is actually created.
  async resolveCoupon(
    rawCode: string,
    redeemer: CouponRedeemer,
    cart: ResolvedCart
  ): Promise<CouponApplication> {
    const coupon = await this.assertUsable(rawCode, redeemer, 'shop');

    if (cart.subtotal < coupon.minSubtotal) {
      throw new BadRequestException('Your bag does not meet the minimum for this coupon');
    }

    const eligible = this.eligibleItems(coupon, cart.items);
    const eligibleSubtotal = eligible.reduce((sum, item) => sum + item.lineTotal, 0);
    if (eligibleSubtotal === 0) {
      throw new BadRequestException('This coupon does not apply to the items in your bag');
    }

    let discountAmount = 0;
    let freeShipping = false;

    if (coupon.type === 'percentage') {
      discountAmount = Math.round((eligibleSubtotal * coupon.value) / 100);
      if (coupon.maxDiscountCap !== null) {
        discountAmount = Math.min(discountAmount, coupon.maxDiscountCap);
      }
    } else if (coupon.type === 'fixed') {
      discountAmount = Math.min(coupon.value, eligibleSubtotal);
    } else {
      freeShipping = true;
    }

    return { coupon, discountAmount, freeShipping };
  }

  private eligibleItems(coupon: CouponDocument, items: ResolvedCartLine[]): ResolvedCartLine[] {
    return items.filter(item => {
      if (!item.available) return false;
      if (coupon.excludeSaleItems && item.onSale) return false;
      if (
        coupon.products.length > 0 &&
        !coupon.products.some(id => id.toString() === item.productId)
      ) {
        return false;
      }
      if (
        coupon.categories.length > 0 &&
        (!item.categoryId || !coupon.categories.some(id => id.toString() === item.categoryId))
      ) {
        return false;
      }
      return true;
    });
  }

  // Commits the discount computed by resolveCoupon: bumps the global usage
  // counter (guarded so it can never exceed usageLimit) and writes the
  // per-user redemption row (guarded by its unique index) in one call. Must
  // run after the order it's tied to already exists, since the row is keyed
  // on order id.
  async reserveRedemption(
    couponId: Types.ObjectId,
    redeemer: CouponRedeemer,
    orderId: Types.ObjectId,
    discountAmount: number
  ): Promise<void> {
    // Committing a redemption without knowing who it belongs to would make the
    // per-person cap unenforceable, so this is a hard error rather than the
    // tolerated null that resolveCoupon allows for previews.
    const identity = this.redemptionIdentity(redeemer);
    if (!identity) {
      throw new BadRequestException('An account or an email address is required to use a coupon');
    }

    const claimed = await this.couponModel.updateOne(
      {
        _id: couponId,
        $or: [{ usageLimit: null }, { $expr: { $lt: ['$usedCount', '$usageLimit'] } }],
      },
      { $inc: { usedCount: 1 } }
    );
    if (claimed.modifiedCount !== 1) {
      throw new ConflictException(
        'This coupon just reached its usage limit — please remove it and try again'
      );
    }

    try {
      await this.redemptionModel.create({
        coupon: couponId,
        ...identity,
        order: orderId,
        discountAmount,
      });
    } catch (err) {
      // Unique-index violation: another concurrent request for this same
      // redeemer+coupon (or order) won the race. Undo the counter bump we just
      // made and surface the same conflict the guard above would have.
      await this.couponModel.updateOne({ _id: couponId }, { $inc: { usedCount: -1 } });
      throw new ConflictException("You've already used this coupon");
    }
  }

  // Reverses reserveRedemption for an order whose payment never completed —
  // exact mirror of stock's releaseReservation. Safe to call for any order,
  // including ones that never had a coupon; it's just a no-op then.
  async releaseRedemption(orderId: Types.ObjectId): Promise<void> {
    const redemption = await this.redemptionModel.findOneAndDelete({ order: orderId });
    if (redemption) {
      await this.couponModel.updateOne({ _id: redemption.coupon }, { $inc: { usedCount: -1 } });
    }
  }

  // --- Admin CRUD ---

  async create(dto: CreateCouponDto) {
    const existing = await this.couponModel.findOne({ code: dto.code.toUpperCase() });
    if (existing) {
      throw new ConflictException('A coupon with this code already exists');
    }
    const coupon = await this.couponModel.create({
      ...dto,
      code: dto.code.toUpperCase(),
      categories: dto.categories.map(id => new Types.ObjectId(id)),
      products: dto.products.map(id => new Types.ObjectId(id)),
    });
    return { success: true, message: 'Coupon created', data: coupon };
  }

  async findAll() {
    const coupons = await this.couponModel.find().sort({ createdAt: -1 });
    return { success: true, message: 'Coupons retrieved', data: coupons };
  }

  private async findOrThrow(id: string): Promise<CouponDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid coupon id');
    }
    const coupon = await this.couponModel.findById(id);
    if (!coupon) {
      throw new NotFoundException('Coupon not found');
    }
    return coupon;
  }

  async findOne(id: string) {
    const coupon = await this.findOrThrow(id);
    return { success: true, message: 'Coupon retrieved', data: coupon };
  }

  async update(id: string, dto: UpdateCouponDto) {
    const coupon = await this.findOrThrow(id);

    if (dto.code && dto.code.toUpperCase() !== coupon.code) {
      const clash = await this.couponModel.findOne({ code: dto.code.toUpperCase() });
      if (clash) {
        throw new ConflictException('A coupon with this code already exists');
      }
    }

    Object.assign(coupon, {
      ...dto,
      ...(dto.code ? { code: dto.code.toUpperCase() } : {}),
      ...(dto.categories ? { categories: dto.categories.map(id => new Types.ObjectId(id)) } : {}),
      ...(dto.products ? { products: dto.products.map(id => new Types.ObjectId(id)) } : {}),
    });
    await coupon.save();
    return { success: true, message: 'Coupon updated', data: coupon };
  }

  async remove(id: string) {
    const coupon = await this.findOrThrow(id);
    await coupon.deleteOne();
    return { success: true, message: 'Coupon deleted', data: null };
  }
}
