import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PRODUCT_SIZES } from '@/products/schemas/product-size-stock.schema';

export const createBackInStockRequestSchema = z.object({
  size: z.enum(PRODUCT_SIZES),
  email: z.email({ message: 'Please provide a valid email address' }),
});

export class CreateBackInStockRequestDto extends createZodDto(createBackInStockRequestSchema) {}
