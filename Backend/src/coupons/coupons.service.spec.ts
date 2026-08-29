import { Test } from '@nestjs/testing';
import { getModelToken } from '@nestjs/mongoose';
import { NotFoundException, BadRequestException, ConflictException } from '@nestjs/common';
import { Types } from 'mongoose';
import { CouponsService } from './coupons.service';
import { Coupon } from './schemas/coupon.schema';
import { CouponRedemption } from './schemas/coupon-redemption.schema';
import { ResolvedCart, ResolvedCartLine } from '@/cart/cart.service';

// Money-critical logic only: discount calculation, eligibility scoping, and
// the rejection paths (expiry/window, usage caps, minimums, prior
// redemption). The atomic guards themselves (usedCount race, unique-index
// race) need a real MongoDB to mean anything and are covered separately in
// coupons.concurrency.spec.ts.

function line(overrides: Partial<ResolvedCartLine> = {}): ResolvedCartLine {
  return {
    productId: new Types.ObjectId().toString(),
    size: 'M',
    available: true,
    reason: 'ok',
    requestedQuantity: 1,
    quantity: 1,
    availableStock: 5,
    unitPrice: 10000,
    lineTotal: 10000,
    name: 'Test Product',
    slug: 'test-product',
    color: 'Black',
    image: null,
    categoryId: new Types.ObjectId().toString(),
    onSale: false,
    ...overrides,
  };
}

function cart(items: ResolvedCartLine[]): ResolvedCart {
  return { items, subtotal: items.reduce((s, i) => s + i.lineTotal, 0), hasChanges: false };
}

function baseCoupon(overrides: Partial<Coupon> = {}) {
  return {
    _id: new Types.ObjectId(),
    code: 'TEST10',
    type: 'percentage' as const,
    value: 10,
    minSubtotal: 0,
    maxDiscountCap: null,
    startsAt: null,
    endsAt: null,
    usageLimit: null,
    usedCount: 0,
    categories: [],
    products: [],
    excludeSaleItems: false,
    isActive: true,
    ...overrides,
  };
}

describe('CouponsService.resolveCoupon', () => {
  let service: CouponsService;
  let couponModel: { findOne: jest.Mock };
  let redemptionModel: { exists: jest.Mock };

  beforeEach(async () => {
    couponModel = { findOne: jest.fn() };
    redemptionModel = { exists: jest.fn().mockResolvedValue(null) };

    const module = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getModelToken(Coupon.name), useValue: couponModel },
        { provide: getModelToken(CouponRedemption.name), useValue: redemptionModel },
      ],
    }).compile();

    service = module.get(CouponsService);
  });

  it('applies a percentage discount', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon({ type: 'percentage', value: 20 }));
    const result = await service.resolveCoupon(
      'TEST10',
      { userId: 'user1' },
      cart([line({ lineTotal: 10000 })])
    );
    expect(result.discountAmount).toBe(2000);
    expect(result.freeShipping).toBe(false);
  });

  it('caps a percentage discount at maxDiscountCap', async () => {
    couponModel.findOne.mockResolvedValue(
      baseCoupon({ type: 'percentage', value: 50, maxDiscountCap: 1000 })
    );
    const result = await service.resolveCoupon(
      'TEST10',
      { userId: 'user1' },
      cart([line({ lineTotal: 10000 })])
    );
    expect(result.discountAmount).toBe(1000);
  });

  it('clamps a fixed discount to the eligible subtotal', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon({ type: 'fixed', value: 50000 }));
    const result = await service.resolveCoupon(
      'TEST10',
      { userId: 'user1' },
      cart([line({ lineTotal: 10000 })])
    );
    expect(result.discountAmount).toBe(10000);
  });

  it('flags free shipping with no cash discount', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon({ type: 'free_shipping', value: 0 }));
    const result = await service.resolveCoupon(
      'TEST10',
      { userId: 'user1' },
      cart([line({ lineTotal: 10000 })])
    );
    expect(result.freeShipping).toBe(true);
    expect(result.discountAmount).toBe(0);
  });

  it('rejects when the cart subtotal is below minSubtotal', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon({ minSubtotal: 50000 }));
    await expect(
      service.resolveCoupon('TEST10', { userId: 'user1' }, cart([line({ lineTotal: 10000 })]))
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a coupon that has not started yet', async () => {
    const future = new Date(Date.now() + 86400000);
    couponModel.findOne.mockResolvedValue(baseCoupon({ startsAt: future }));
    await expect(
      service.resolveCoupon('TEST10', { userId: 'user1' }, cart([line()]))
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an expired coupon', async () => {
    const past = new Date(Date.now() - 86400000);
    couponModel.findOne.mockResolvedValue(baseCoupon({ endsAt: past }));
    await expect(
      service.resolveCoupon('TEST10', { userId: 'user1' }, cart([line()]))
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects once the global usage limit is reached', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon({ usageLimit: 5, usedCount: 5 }));
    await expect(
      service.resolveCoupon('TEST10', { userId: 'user1' }, cart([line()]))
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects a user who already redeemed this coupon', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon());
    redemptionModel.exists.mockResolvedValue({ _id: new Types.ObjectId() });
    await expect(
      service.resolveCoupon('TEST10', { userId: 'user1' }, cart([line()]))
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown code', async () => {
    couponModel.findOne.mockResolvedValue(null);
    await expect(
      service.resolveCoupon('NOPE', { userId: 'user1' }, cart([line()]))
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an inactive coupon', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon({ isActive: false }));
    await expect(
      service.resolveCoupon('TEST10', { userId: 'user1' }, cart([line()]))
    ).rejects.toBeInstanceOf(NotFoundException);
  });

  it('excludes sale items when excludeSaleItems is set', async () => {
    couponModel.findOne.mockResolvedValue(
      baseCoupon({ type: 'percentage', value: 10, excludeSaleItems: true })
    );
    const items = [
      line({ lineTotal: 10000, onSale: false }),
      line({ lineTotal: 5000, onSale: true }),
    ];
    const result = await service.resolveCoupon('TEST10', { userId: 'user1' }, cart(items));
    // Only the non-sale 10000 line counts toward the discount base.
    expect(result.discountAmount).toBe(1000);
  });

  it('rejects when every eligible item is on sale and excludeSaleItems is set', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon({ excludeSaleItems: true }));
    await expect(
      service.resolveCoupon('TEST10', { userId: 'user1' }, cart([line({ onSale: true })]))
    ).rejects.toBeInstanceOf(BadRequestException);
  });

  it('scopes the discount to an allow-listed category', async () => {
    const includedCategory = new Types.ObjectId();
    const otherCategory = new Types.ObjectId();
    couponModel.findOne.mockResolvedValue(
      baseCoupon({ type: 'percentage', value: 10, categories: [includedCategory] })
    );
    const items = [
      line({ lineTotal: 10000, categoryId: includedCategory.toString() }),
      line({ lineTotal: 20000, categoryId: otherCategory.toString() }),
    ];
    const result = await service.resolveCoupon('TEST10', { userId: 'user1' }, cart(items));
    expect(result.discountAmount).toBe(1000);
  });

  it('scopes the discount to an allow-listed product', async () => {
    const includedProduct = new Types.ObjectId();
    couponModel.findOne.mockResolvedValue(
      baseCoupon({ type: 'fixed', value: 5000, products: [includedProduct] })
    );
    const items = [
      line({ lineTotal: 10000, productId: includedProduct.toString() }),
      line({ lineTotal: 20000 }),
    ];
    const result = await service.resolveCoupon('TEST10', { userId: 'user1' }, cart(items));
    expect(result.discountAmount).toBe(5000);
  });

  it('ignores unavailable cart lines when computing eligibility', async () => {
    couponModel.findOne.mockResolvedValue(baseCoupon({ type: 'percentage', value: 10 }));
    const items = [line({ lineTotal: 10000 }), line({ lineTotal: 90000, available: false })];
    const result = await service.resolveCoupon('TEST10', { userId: 'user1' }, cart(items));
    expect(result.discountAmount).toBe(1000);
  });
});

describe('CouponsService.reserveRedemption', () => {
  let service: CouponsService;
  let couponModel: { updateOne: jest.Mock };
  let redemptionModel: { create: jest.Mock };

  beforeEach(async () => {
    couponModel = { updateOne: jest.fn() };
    redemptionModel = { create: jest.fn() };

    const module = await Test.createTestingModule({
      providers: [
        CouponsService,
        { provide: getModelToken(Coupon.name), useValue: couponModel },
        { provide: getModelToken(CouponRedemption.name), useValue: redemptionModel },
      ],
    }).compile();

    service = module.get(CouponsService);
  });

  it('throws when the guarded $inc reports no match (usage limit hit concurrently)', async () => {
    couponModel.updateOne.mockResolvedValue({ modifiedCount: 0 });
    await expect(
      service.reserveRedemption(
        new Types.ObjectId(),
        { userId: 'user1' },
        new Types.ObjectId(),
        1000
      )
    ).rejects.toBeInstanceOf(ConflictException);
    expect(redemptionModel.create).not.toHaveBeenCalled();
  });

  it('rolls back the counter bump when the redemption insert hits the unique index', async () => {
    couponModel.updateOne.mockResolvedValue({ modifiedCount: 1 });
    redemptionModel.create.mockRejectedValue({ code: 11000 });
    const couponId = new Types.ObjectId();

    await expect(
      service.reserveRedemption(couponId, { userId: 'user1' }, new Types.ObjectId(), 1000)
    ).rejects.toBeInstanceOf(ConflictException);

    expect(couponModel.updateOne).toHaveBeenCalledTimes(2);
    expect(couponModel.updateOne).toHaveBeenLastCalledWith(
      { _id: couponId },
      { $inc: { usedCount: -1 } }
    );
  });
});
