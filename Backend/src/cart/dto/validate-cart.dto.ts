import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { cartItemSchema } from './cart-item.dto';

export const validateCartSchema = z.object({
  items: z.array(cartItemSchema).max(100),
});

export class ValidateCartDto extends createZodDto(validateCartSchema) {}
