import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { createProductSchema } from './create-product.dto';

export const updateProductSchema = createProductSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export class UpdateProductDto extends createZodDto(updateProductSchema) {}
