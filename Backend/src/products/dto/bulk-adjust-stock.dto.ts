import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PRODUCT_SIZES } from '../schemas/product-size-stock.schema';

export const bulkAdjustStockSchema = z.object({
  lines: z
    .array(
      z.object({
        productId: z.string().min(1),
        size: z.enum(PRODUCT_SIZES),
        // Positive adds stock back (recount found more, damaged-unit
        // correction reversed), negative removes it (damaged, lost, recount
        // found less). Zero is meaningless and rejected in the service.
        quantityChange: z
          .number()
          .int()
          .refine(n => n !== 0, 'quantityChange cannot be 0'),
      })
    )
    .min(1, 'Provide at least one line to adjust'),
});

export class BulkAdjustStockDto extends createZodDto(bulkAdjustStockSchema) {}
