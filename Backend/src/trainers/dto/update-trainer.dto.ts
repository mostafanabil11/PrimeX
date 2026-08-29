import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { trainerFields } from './create-trainer.dto';

export const updateTrainerSchema = z.object(trainerFields).partial();

export class UpdateTrainerDto extends createZodDto(updateTrainerSchema) {}
