import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const verifyEmailSchema = z.object({
  email: z.email({ message: 'Please provide a valid email address' }),
  otp: z.string().regex(/^\d{6}$/, { message: 'OTP must be a 6-digit number' }),
});

export class VerifyEmailDto extends createZodDto(verifyEmailSchema) {}
