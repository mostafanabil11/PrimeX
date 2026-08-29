import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PRODUCT_SIZES } from '../schemas/product-size-stock.schema';

export const productQuerySchema = z.object({
  category: z.string().optional(),
  size: z.enum(PRODUCT_SIZES).optional(),
  color: z.string().trim().min(1).max(50).optional(),
  // Minor units (piastres), same convention as Product.price — the client
  // converts from whatever major-unit input it shows the shopper.
  minPrice: z.coerce.number().int().min(0).optional(),
  maxPrice: z.coerce.number().int().min(0).optional(),
  onSale: z.coerce.boolean().optional(),
  sort: z.enum(['newest', 'price_asc', 'price_desc']).optional(),
  q: z.string().trim().min(1).max(100).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class ProductQueryDto extends createZodDto(productQuerySchema) {}
