import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { COUPON_TYPES } from '../schemas/coupon.schema';

// Kept as a plain object (not the refined version below) so update-coupon.dto
// can call .partial() on it — Zod doesn't allow .partial() on a schema that
// already has a superRefine attached.
export const couponBaseSchema = z.object({
  code: z
    .string()
    .min(3, 'Code must be at least 3 characters')
    .max(30)
    .regex(/^[A-Za-z0-9_-]+$/, 'Code may only contain letters, numbers, hyphens and underscores'),
  type: z.enum(COUPON_TYPES),
  // percentage: whole points (10 = 10%). fixed: minor units off. Ignored for free_shipping.
  value: z.number().int().min(0).default(0),
  minSubtotal: z.number().int('Must be a whole number of minor units').min(0).default(0),
  maxDiscountCap: z.number().int().positive().optional().nullable(),
  // Kept as a plain ISO string in the DTO — z.coerce.date() outputs a Date,
  // which nestjs-zod's Swagger JSON-schema conversion cannot represent and
  // crashes on at bootstrap. Mongoose casts the string to Date on write.
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  usageLimit: z.number().int().positive().optional().nullable(),
  categories: z.array(z.string()).default([]),
  products: z.array(z.string()).default([]),
  excludeSaleItems: z.boolean().default(false),
  isActive: z.boolean().default(true),
});

export const createCouponSchema = couponBaseSchema.superRefine((data, ctx) => {
  if (data.type === 'percentage' && (data.value < 1 || data.value > 100)) {
    ctx.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'A percentage coupon must be between 1 and 100',
    });
  }
  if (data.type === 'fixed' && data.value < 1) {
    ctx.addIssue({
      code: 'custom',
      path: ['value'],
      message: 'A fixed-amount coupon must be greater than 0',
    });
  }
  if (data.startsAt && data.endsAt && new Date(data.startsAt) >= new Date(data.endsAt)) {
    ctx.addIssue({
      code: 'custom',
      path: ['endsAt'],
      message: 'End date must be after the start date',
    });
  }
});

export class CreateCouponDto extends createZodDto(createCouponSchema) {}
