import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// No .default() anywhere — see branches/dto/create-branch.dto.ts.
export const classTypeFields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and hyphens')
    .max(140)
    .optional(),
  description: z.string().trim().max(2000).nullish(),
  image: z.string().trim().max(500).nullish(),

  intensity: z.number().int().min(1).max(5).optional(),
  durationMinutes: z.number().int().min(5).max(300),
  equipment: z.array(z.string().trim().min(1).max(80)).max(30).optional(),
  defaultCapacity: z.number().int().min(1).max(500).optional(),
  colorToken: z.string().trim().max(60).nullish(),

  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
};

export const createClassTypeSchema = z.object(classTypeFields);

export class CreateClassTypeDto extends createZodDto(createClassTypeSchema) {}
