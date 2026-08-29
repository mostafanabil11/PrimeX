import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { cartItemSchema } from '@/cart/dto/cart-item.dto';

export const validateCouponSchema = z.object({
  code: z.string().min(1, 'Enter a coupon code').max(30),

  // Guests have no server cart and no account, so they supply both halves the
  // signed-in path reads from the database. Ignored entirely when the caller
  // is authenticated — their own cart and identity always win, so a client
  // can't preview a discount against a basket it doesn't really have.
  email: z.string().trim().email('Please provide a valid email address').max(200).optional(),
  items: z.array(cartItemSchema).max(100).optional(),
});

export class ValidateCouponDto extends createZodDto(validateCouponSchema) {}
