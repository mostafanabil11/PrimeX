import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createCategorySchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  parent: z.string().optional().nullable(),
  image: z.string().optional().nullable(),
  description: z.string().max(500).optional().nullable(),
  displayOrder: z.number().int().optional(),
  isFeaturedOnHome: z.boolean().optional(),
});

export class CreateCategoryDto extends createZodDto(createCategorySchema) {}
