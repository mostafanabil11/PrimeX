import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EGYPT_GOVERNORATES } from '@/common/utils/egypt.util';
import { WEEKDAYS } from '../schemas/branch.schema';

// "HH:mm", 24-hour. Validated as a string rather than coerced to a Date
// because these are wall-clock times that repeat weekly, not instants.
const TIME = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm, for example 06:00 or 22:30');

export const openingHoursSchema = z
  .object({
    day: z.enum(WEEKDAYS),
    isClosed: z.boolean().optional(),
    opensAt: TIME,
    closesAt: TIME,
  })
  // A branch that closes before it opens would render as negative hours and
  // silently break any "open now" check built on top of it.
  .refine(v => v.isClosed || v.closesAt > v.opensAt, {
    path: ['closesAt'],
    message: 'Closing time must be after opening time',
  });

export const womenOnlyWindowSchema = z
  .object({
    day: z.enum(WEEKDAYS),
    startsAt: TIME,
    endsAt: TIME,
  })
  .refine(v => v.endsAt > v.startsAt, {
    path: ['endsAt'],
    message: 'The window must end after it starts',
  });

// Deliberately carries no .default() anywhere.
//
// UpdateBranchDto is this schema .partial()-ed, and Zod applies a field's
// default whenever that field is absent from the input — including on a PATCH.
// A default here would mean an admin editing only the phone number silently
// posts facilities: [], openingHours: [], sortOrder: 0 alongside it, and the
// service $sets all of them. That is not hypothetical; it wiped a branch's
// facilities and opening hours the first time this module was exercised.
//
// Defaults for new documents belong on the Mongoose schema, which applies them
// on insert only. See branch.schema.ts.
export const branchFields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  // Optional: the service derives one from the name when it is omitted.
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens')
    .max(140)
    .optional(),
  description: z.string().trim().max(2000).nullish(),

  addressLine: z.string().trim().min(1, 'Address is required').max(300),
  city: z.string().trim().min(1, 'City is required').max(100),
  governorate: z.enum(EGYPT_GOVERNORATES),
  latitude: z.number().min(-90).max(90).nullish(),
  longitude: z.number().min(-180).max(180).nullish(),
  googleMapsUrl: z.url().max(500).nullish(),

  phone: z.string().trim().max(30).nullish(),
  whatsappNumber: z.string().trim().max(30).nullish(),
  email: z.email().max(200).nullish(),

  facilities: z.array(z.string().trim().min(1).max(80)).max(40).optional(),
  images: z.array(z.string().trim().min(1).max(500)).max(20).optional(),
  openingHours: z.array(openingHoursSchema).max(7).optional(),
  womenOnlyWindows: z.array(womenOnlyWindowSchema).max(21).optional(),

  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
};

export const createBranchSchema = z.object(branchFields);

export class CreateBranchDto extends createZodDto(createBranchSchema) {}
