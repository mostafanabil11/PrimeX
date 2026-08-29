import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { classTypeFields } from './create-class-type.dto';

export const updateClassTypeSchema = z.object(classTypeFields).partial();

export class UpdateClassTypeDto extends createZodDto(updateClassTypeSchema) {}
