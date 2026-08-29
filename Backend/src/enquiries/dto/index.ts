import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { ENQUIRY_TYPES, ENQUIRY_STATUSES } from '../schemas/enquiry.schema';

const OBJECT_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');

// Public submission. Kept as short as it can be — every extra required field
// on a lead form costs conversions, and staff can ask the rest on the phone.
export const createEnquirySchema = z.object({
  type: z.enum(ENQUIRY_TYPES),
  name: z.string().trim().min(1, 'Please tell us your name').max(120),
  phone: z
    .string()
    .trim()
    .min(6, 'Please give us a number we can reach you on')
    .max(30)
    // Digits, spaces and the usual separators. Deliberately loose: Egyptian
    // numbers get written +20 10…, 010…, and 0020 10…, and rejecting a real
    // customer over formatting is worse than storing an odd string.
    .regex(/^[+()\-\s\d]+$/, 'Please use digits only'),
  email: z.email().max(200).nullish(),
  message: z.string().trim().max(2000).nullish(),
  goal: z.string().trim().max(200).nullish(),
  preferredTime: z.string().trim().max(120).nullish(),
  branch: OBJECT_ID.nullish(),
  trainer: OBJECT_ID.nullish(),
  source: z.string().trim().max(200).nullish(),

  // Honeypot. A real browser never fills this because it is hidden; most
  // form-spam bots fill every input they find. Accepted and silently discarded
  // rather than rejected, so a bot cannot learn what tripped it.
  website: z.string().max(200).optional(),
});

export class CreateEnquiryDto extends createZodDto(createEnquirySchema) {}

export const updateEnquirySchema = z.object({
  status: z.enum(ENQUIRY_STATUSES).optional(),
  assignedTo: OBJECT_ID.nullish(),
  branch: OBJECT_ID.nullish(),
});

export class UpdateEnquiryDto extends createZodDto(updateEnquirySchema) {}

export const addEnquiryNoteSchema = z.object({
  body: z.string().trim().min(1, 'A note cannot be empty').max(2000),
});

export class AddEnquiryNoteDto extends createZodDto(addEnquiryNoteSchema) {}

export const enquiryQuerySchema = z.object({
  type: z.enum(ENQUIRY_TYPES).optional(),
  status: z.enum(ENQUIRY_STATUSES).optional(),
  branch: OBJECT_ID.optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class EnquiryQueryDto extends createZodDto(enquiryQuerySchema) {}
