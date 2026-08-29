import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import {
  DURATION_UNITS,
  CLASS_ACCESS_MODES,
  BRANCH_ACCESS_MODES,
  ACCESS_SCOPES,
} from '../schemas/plan.schema';

// No .default() on any field — see the note in branches/dto/create-branch.dto.ts.
// UpdatePlanDto partials this shape, and a default here would silently reset
// benefits, class access or the featured flag on any patch that omits them.
export const planFields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens')
    .max(140)
    .optional(),
  tier: z.string().trim().max(60).nullish(),
  description: z.string().trim().max(2000).nullish(),
  benefits: z.array(z.string().trim().min(1).max(200)).max(30).optional(),

  durationValue: z.number().int().min(1).max(120),
  durationUnit: z.enum(DURATION_UNITS),

  priceMinorUnits: z.number().int().min(0),
  discountPriceMinorUnits: z.number().int().min(0).nullish(),
  joiningFeeMinorUnits: z.number().int().min(0).nullish(),

  classAccess: z
    .object({
      mode: z.enum(CLASS_ACCESS_MODES),
      creditsPerCycle: z.number().int().min(0).max(500).optional(),
    })
    // A credits plan granting zero credits is indistinguishable from 'none' to
    // a member, but reads as a working plan to an admin. Catching it here
    // stops a plan shipping that can never book anything.
    .refine(v => v.mode !== 'credits' || (v.creditsPerCycle ?? 0) > 0, {
      path: ['creditsPerCycle'],
      message: 'A credits plan needs at least one credit per cycle',
    })
    .optional(),

  branchAccess: z.enum(BRANCH_ACCESS_MODES).optional(),
  accessScope: z.enum(ACCESS_SCOPES).optional(),

  // Null on either is the deliberate way to say unlimited — see the note on
  // the schema. z.nullish() so an admin can clear a cap they had set.
  sessionsIncluded: z.number().int().min(0).max(2000).nullish(),
  daysPerWeek: z.number().int().min(1).max(7).nullish(),

  freezeDaysAllowed: z.number().int().min(0).max(365).optional(),
  guestPasses: z.number().int().min(0).max(100).optional(),

  perks: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(60),
        value: z.number().int().min(0).max(1000),
      })
    )
    .max(20)
    .optional(),

  sortOrder: z.number().int().min(0).optional(),
  isFeatured: z.boolean().optional(),
  isActive: z.boolean().optional(),
};

export const createPlanSchema = z
  .object(planFields)
  // A "discount" at or above the real price is either a typo or dark-pattern
  // pricing. Neither belongs in the database.
  .refine(
    v =>
      v.discountPriceMinorUnits === null ||
      v.discountPriceMinorUnits === undefined ||
      v.discountPriceMinorUnits < v.priceMinorUnits,
    {
      path: ['discountPriceMinorUnits'],
      message: 'The discounted price must be lower than the regular price',
    }
  );

export class CreatePlanDto extends createZodDto(createPlanSchema) {}
