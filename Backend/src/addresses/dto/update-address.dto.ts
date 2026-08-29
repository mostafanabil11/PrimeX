import { createZodDto } from 'nestjs-zod';
import { createAddressSchema } from './create-address.dto';

export const updateAddressSchema = createAddressSchema.partial();

export class UpdateAddressDto extends createZodDto(updateAddressSchema) {}
