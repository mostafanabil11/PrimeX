import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createCategorySchema } from './create-category.dto';

export const updateCategorySchema = createCategorySchema.partial().extend({
  isActive: z.boolean().optional(),
});

export class UpdateCategoryDto extends createZodDto(updateCategorySchema) {}
