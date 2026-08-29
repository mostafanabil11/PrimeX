import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

// Backs the "track your order" page. The pair is the credential: an order
// number alone is guessable, an email alone identifies nothing.
// Both are trimmed before validating: these get copy-pasted out of a
// confirmation email, and a trailing space should not read as "no such order".
export const lookupOrderSchema = z.object({
  orderNumber: z.string().trim().min(1, 'Enter your order number').max(40),
  email: z.string().trim().email('Enter the email address you ordered with').max(200),
});

export class LookupOrderDto extends createZodDto(lookupOrderSchema) {}
