import 'dotenv/config';
import mongoose, { Connection, Model, Types } from 'mongoose';
import { CouponsService } from './coupons.service';
import { Coupon, CouponDocument, CouponSchema } from './schemas/coupon.schema';
import {
  CouponRedemption,
  CouponRedemptionDocument,
  CouponRedemptionSchema,
} from './schemas/coupon-redemption.schema';

// Real-database test, same pattern as the Phase 2 stock-reservation race
// check: mocked models prove nothing about whether Mongo's own atomicity
// actually holds. This connects to the same MongoDB the dev server uses,
// creates throwaway documents prefixed so they can never collide with real
// data, and deletes everything it made in afterAll regardless of outcome.
describe('CouponsService concurrent redemption (real MongoDB)', () => {
  let connection: Connection;
  let couponModel: Model<CouponDocument>;
  let redemptionModel: Model<CouponRedemptionDocument>;
  let service: CouponsService;
  const createdCouponIds: Types.ObjectId[] = [];

  beforeAll(async () => {
    const uri = process.env.MONGODB_URI;
    if (!uri) {
      throw new Error('MONGODB_URI must be set to run the coupon concurrency test');
    }
    connection = (await mongoose.createConnection(uri).asPromise()) as Connection;
    // Mongoose's Connection.model<T>() generic and the Model<T> type from
    // @nestjs/mongoose disagree structurally in this Mongoose version even
    // though they describe the same runtime object — cast through unknown
    // rather than fight the generics in a test file.
    couponModel = connection.model(Coupon.name, CouponSchema) as unknown as Model<CouponDocument>;
    redemptionModel = connection.model(
      CouponRedemption.name,
      CouponRedemptionSchema
    ) as unknown as Model<CouponRedemptionDocument>;
    service = new CouponsService(couponModel, redemptionModel);
  }, 20000);

  afterAll(async () => {
    await couponModel.deleteMany({ _id: { $in: createdCouponIds } });
    await redemptionModel.deleteMany({ coupon: { $in: createdCouponIds } });
    await connection.close();
  }, 20000);

  async function makeCoupon(overrides: Partial<Coupon> = {}) {
    const coupon = await couponModel.create({
      code: `CONCTEST-${new Types.ObjectId().toString()}`,
      type: 'fixed',
      value: 1000,
      ...overrides,
    });
    createdCouponIds.push(coupon._id);
    return coupon;
  }

  it('lets exactly one of five concurrent redemptions through when usageLimit is 1', async () => {
    const coupon = await makeCoupon({ usageLimit: 1 });

    const attempts = Array.from({ length: 5 }, () =>
      service
        .reserveRedemption(
          coupon._id,
          { userId: new Types.ObjectId().toString() },
          new Types.ObjectId(),
          1000
        )
        .then(() => 'ok' as const)
        .catch(() => 'rejected' as const)
    );
    const results = await Promise.all(attempts);

    expect(results.filter(r => r === 'ok')).toHaveLength(1);
    expect(results.filter(r => r === 'rejected')).toHaveLength(4);

    const finalCoupon = await couponModel.findById(coupon._id);
    expect(finalCoupon!.usedCount).toBe(1);

    const redemptionCount = await redemptionModel.countDocuments({ coupon: coupon._id });
    expect(redemptionCount).toBe(1);
  }, 20000);

  it('lets exactly one of five concurrent redemptions through for the same user+coupon', async () => {
    const coupon = await makeCoupon({ usageLimit: null });
    const sameUserId = new Types.ObjectId().toString();

    const attempts = Array.from({ length: 5 }, () =>
      service
        .reserveRedemption(coupon._id, { userId: sameUserId }, new Types.ObjectId(), 1000)
        .then(() => 'ok' as const)
        .catch(() => 'rejected' as const)
    );
    const results = await Promise.all(attempts);

    expect(results.filter(r => r === 'ok')).toHaveLength(1);

    const finalCoupon = await couponModel.findById(coupon._id);
    // The four failed inserts each rolled their own $inc back out, so the
    // counter should reflect only the one redemption that actually stuck.
    expect(finalCoupon!.usedCount).toBe(1);
  }, 20000);

  it('releaseRedemption frees both the per-user slot and the global counter', async () => {
    const coupon = await makeCoupon({ usageLimit: 1 });
    const userId = new Types.ObjectId().toString();
    const orderId = new Types.ObjectId();

    await service.reserveRedemption(coupon._id, { userId }, orderId, 1000);
    expect((await couponModel.findById(coupon._id))!.usedCount).toBe(1);

    await service.releaseRedemption(orderId);

    expect((await couponModel.findById(coupon._id))!.usedCount).toBe(0);
    expect(await redemptionModel.countDocuments({ order: orderId })).toBe(0);

    // Released slot means the same user can now redeem it again.
    await expect(
      service.reserveRedemption(coupon._id, { userId }, new Types.ObjectId(), 1000)
    ).resolves.toBeUndefined();
  }, 20000);
});
