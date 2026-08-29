import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Everything optional: the admin settings form submits only what changed, and
// the service $sets exactly the keys it receives.
const optionalUrl = z.url().max(300).nullish();

export const updateSettingsSchema = z
  .object({
    // --- Brand ---
    brandName: z.string().trim().min(1).max(100).optional(),
    tagline: z.string().trim().max(200).optional(),
    supportEmail: z.email().max(200).nullish(),
    supportPhone: z.string().trim().max(30).nullish(),
    whatsappNumber: z.string().trim().max(30).nullish(),
    instagramUrl: optionalUrl,
    facebookUrl: optionalUrl,
    tiktokUrl: optionalUrl,
    youtubeUrl: optionalUrl,

    // --- Money ---
    currency: z.string().trim().min(1).max(10).optional(),
    taxRateBasisPoints: z.number().int().min(0).max(10000).optional(),
    joiningFeeMinorUnits: z.number().int().min(0).optional(),
    chargeJoiningFeeOnLapsedRenewal: z.boolean().optional(),
    lapsedRenewalGraceDays: z.number().int().min(0).max(365).optional(),

    // --- Membership policy ---
    maxFreezeDaysPerCycle: z.number().int().min(0).max(365).optional(),
    cancellationNoticeDays: z.number().int().min(0).max(365).optional(),

    // --- Booking policy ---
    bookingHorizonDays: z.number().int().min(1).max(90).optional(),
    bookingCutoffHours: z.number().int().min(0).max(168).optional(),
    freeCancellationWindowHours: z.number().int().min(0).max(168).optional(),
    noShowLimit: z.number().int().min(0).max(50).optional(),
    noShowSuspensionDays: z.number().int().min(0).max(365).optional(),
    maxConcurrentBookings: z.number().int().min(1).max(100).optional(),

    // --- Retail (dormant storefront) ---
    freeShippingThresholdMinorUnits: z.number().int().min(0).optional(),
    flatShippingRateMinorUnits: z.number().int().min(0).optional(),
  })
  // Cancelling later than booking even closes would be unreachable policy: the
  // member could no longer cancel at all, only no-show. Caught here rather
  // than in the booking service so an impossible pair is never stored.
  .refine(
    data =>
      data.freeCancellationWindowHours === undefined ||
      data.bookingCutoffHours === undefined ||
      data.freeCancellationWindowHours >= data.bookingCutoffHours,
    {
      path: ['freeCancellationWindowHours'],
      message:
        'The free-cancellation window must be at least as long as the booking cutoff, otherwise members could never cancel in time',
    }
  );

export class UpdateSettingsDto extends createZodDto(updateSettingsSchema) {}
