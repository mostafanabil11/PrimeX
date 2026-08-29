import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const subscribeSchema = z.object({
  email: z.email({ message: 'Please provide a valid email address' }),
});

export class SubscribeDto extends createZodDto(subscribeSchema) {}
