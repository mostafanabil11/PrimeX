import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const updateOrderStatusSchema = z
  .object({
    fulfillmentStatus: z.enum(['shipped', 'delivered']).optional(),
    paymentStatus: z.enum(['refunded']).optional(),
    trackingNumber: z.string().max(100).optional(),
  })
  .refine(data => data.fulfillmentStatus || data.paymentStatus, {
    message: 'Provide a fulfillmentStatus or paymentStatus to update',
  });

export class UpdateOrderStatusDto extends createZodDto(updateOrderStatusSchema) {}
