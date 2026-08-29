import { createZodDto } from 'nestjs-zod';
import { couponBaseSchema } from './create-coupon.dto';

export const updateCouponSchema = couponBaseSchema.partial();

export class UpdateCouponDto extends createZodDto(updateCouponSchema) {}
