import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PAYMENT_STATUSES } from '../schemas/order.schema';
import { FULFILLMENT_STATUSES } from '../schemas/order.schema';

export const adminOrderQuerySchema = z.object({
  paymentStatus: z.enum(PAYMENT_STATUSES).optional(),
  fulfillmentStatus: z.enum(FULFILLMENT_STATUSES).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(100).optional(),
});

export class AdminOrderQueryDto extends createZodDto(adminOrderQuerySchema) {}
