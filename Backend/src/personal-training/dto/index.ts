import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PT_REQUEST_STATUSES } from '../schemas/pt-request.schema';

const OBJECT_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');

// Same loose phone rule as the enquiry and reservation forms, and for the same
// reason: Egyptian numbers get written +20 10…, 010… and 0020 10…, and turning
// a real customer away over formatting is worse than storing an odd string.
// The service normalises it before matching a member.
const PHONE = z
  .string()
  .trim()
  .min(6, 'Please give us a number we can reach you on')
  .max(30)
  .regex(/^[+()\-\s\d]+$/, 'Please use digits only');

/**
 * The public reservation. Deliberately the same shape as the membership
 * reservation minus the money: who you are, which coach, when you want to
 * start — plus two optional lines that exist for the coach rather than for us.
 *
 * No `sessions` and no `price`. The gym has not decided how PT is sold yet, so
 * asking "how many sessions?" would be asking a question the site cannot price
 * and the visitor cannot answer. That is settled on WhatsApp; see the note on
 * the schema for what changes when it stops being.
 */
export const reservePtSchema = z.object({
  trainerId: OBJECT_ID,
  firstName: z.string().trim().min(1, 'Please tell us your first name').max(60),
  lastName: z.string().trim().min(1, 'Please tell us your last name').max(60),
  phone: PHONE,
  email: z.email().max(200).nullish(),
  // Date only, no time. Which day they want to begin is a real answer; which
  // hour is something the coach and the member work out between them against
  // the availability windows on the profile.
  preferredStartsAt: z.iso.date('Please choose a start date'),
  preferredTimes: z.string().trim().max(200).nullish(),
  goal: z.string().trim().max(500).nullish(),
  // Not optional, and not defaulted to true. The visitor has to have ticked it.
  acceptedAgreement: z.literal(true, {
    message: 'Please accept the gym rules to continue',
  }),

  // Honeypot. Hidden from people, filled by naive bots. Accepted and silently
  // discarded rather than rejected, so whoever wrote the bot learns nothing.
  website: z.string().max(200).optional(),
});

export class ReservePtDto extends createZodDto(reservePtSchema) {}

export const updatePtRequestSchema = z.object({
  status: z.enum(PT_REQUEST_STATUSES).optional(),
});

export class UpdatePtRequestDto extends createZodDto(updatePtRequestSchema) {}

export const addPtNoteSchema = z.object({
  body: z.string().trim().min(1, 'A note cannot be empty').max(2000),
});

export class AddPtNoteDto extends createZodDto(addPtNoteSchema) {}

export const ptRequestQuerySchema = z.object({
  status: z.enum(PT_REQUEST_STATUSES).optional(),
  trainer: OBJECT_ID.optional(),
  /** A reference code, or part of a name or phone number. */
  q: z.string().trim().max(120).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class PtRequestQueryDto extends createZodDto(ptRequestQuerySchema) {}
