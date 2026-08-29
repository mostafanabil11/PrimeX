import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { WEEKDAYS } from '@/branches/schemas/branch.schema';

const TIME = z
  .string()
  .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use 24-hour HH:mm, for example 06:00 or 22:30');

const OBJECT_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');

export const availabilityWindowSchema = z
  .object({
    day: z.enum(WEEKDAYS),
    startsAt: TIME,
    endsAt: TIME,
  })
  .refine(v => v.endsAt > v.startsAt, {
    path: ['endsAt'],
    message: 'The window must end after it starts',
  });

// No .default() anywhere — see branches/dto/create-branch.dto.ts.
export const trainerFields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens')
    .max(140)
    .optional(),
  photo: z.string().trim().max(500).nullish(),
  headline: z.string().trim().max(200).nullish(),
  bio: z.string().trim().max(4000).nullish(),

  specialties: z.array(z.string().trim().min(1).max(80)).max(20).optional(),
  certifications: z.array(z.string().trim().min(1).max(120)).max(20).optional(),
  languages: z.array(z.string().trim().min(1).max(40)).max(10).optional(),
  yearsOfExperience: z.number().int().min(0).max(70).optional(),

  branches: z.array(OBJECT_ID).max(50).optional(),
  availability: z.array(availabilityWindowSchema).max(50).optional(),
  hourlyRateMinorUnits: z.number().int().min(0).nullish(),
  user: OBJECT_ID.nullish(),
  instagramUrl: z.url().max(300).nullish(),

  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
};

export const createTrainerSchema = z.object(trainerFields);

export class CreateTrainerDto extends createZodDto(createTrainerSchema) {}
