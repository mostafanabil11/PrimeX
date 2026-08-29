import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const resendOtpSchema = z.object({
  email: z.email({ message: 'Please provide a valid email address' }),
});

export class ResendOtpDto extends createZodDto(resendOtpSchema) {}
