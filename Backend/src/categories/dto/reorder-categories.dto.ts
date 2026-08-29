import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const reorderCategoriesSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        displayOrder: z.number().int(),
      })
    )
    .min(1, 'At least one item is required'),
});

export class ReorderCategoriesDto extends createZodDto(reorderCategoriesSchema) {}
