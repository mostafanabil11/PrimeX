import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { EGYPT_GOVERNORATES } from '../schemas/address.schema';

export const createAddressSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(100),
  lastName: z.string().min(1, 'Last name is required').max(100),
  phone: z.string().min(6, 'Please provide a valid phone number').max(30),
  addressLine: z.string().min(1, 'Address is required').max(300),
  city: z.string().min(1, 'City is required').max(100),
  governorate: z.enum(EGYPT_GOVERNORATES),
  postalCode: z.string().max(20).optional().nullable(),
  isDefault: z.boolean().optional(),
});

export class CreateAddressDto extends createZodDto(createAddressSchema) {}
