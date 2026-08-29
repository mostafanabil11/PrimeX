import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { OFFER_TYPES } from '../schemas/offer.schema';

// No .default() on any field — UpdateOfferDto partials this shape, and a
// default here would silently reset the targeting or the active flag on any
// patch that omits them. Same reasoning as plans/dto and branches/dto.
export const offerFields = {
  name: z.string().trim().min(1, 'Give the offer a name').max(80),
  type: z.enum(OFFER_TYPES),
  value: z.number().int().min(0),

  tiers: z.array(z.string().trim().min(1).max(60)).max(20).optional(),
  durationMonths: z.array(z.number().int().min(1).max(120)).max(20).optional(),

  // ISO strings rather than z.date(): Swagger builds a JSON Schema from these
  // at boot, and a Date has no JSON Schema representation — zod throws and
  // takes the whole application down with it. Matches coupons/dto, converted
  // to Date in the service.
  startsAt: z.string().datetime().optional().nullable(),
  endsAt: z.string().datetime().optional().nullable(),
  isActive: z.boolean().optional(),
};

export const createOfferSchema = z
  .object(offerFields)
  // A percentage above 100 would price the plan below zero. The resolver
  // floors at zero anyway, but a value like that is a typo — almost always a
  // minor-unit amount typed into the percentage field — and saving it means
  // the pricing page shows "free" until somebody notices.
  .refine(v => v.type !== 'percentage' || v.value <= 100, {
    path: ['value'],
    message: 'A percentage offer cannot be more than 100%',
  })
  .refine(v => !v.startsAt || !v.endsAt || new Date(v.startsAt) < new Date(v.endsAt), {
    path: ['endsAt'],
    message: 'The end date must be after the start date',
  });

export class CreateOfferDto extends createZodDto(createOfferSchema) {}

// Partial for PATCH. The cross-field rules above cannot run here — a patch
// carrying only `value` has no `type` to check it against — so they are
// re-applied in OffersService.update against the stored document, exactly as
// PlansService.update does for the discount price.
export const updateOfferSchema = z.object(offerFields).partial();

export class UpdateOfferDto extends createZodDto(updateOfferSchema) {}
