import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const createReviewSchema = z.object({
  classTypeId: z.string().min(1),
  rating: z.number().int().min(1).max(5),
  title: z.string().trim().min(1, 'Title is required').max(120),
  body: z.string().trim().min(1, 'Review text is required').max(2000),
});

export class CreateReviewDto extends createZodDto(createReviewSchema) {}
