import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

export const moderateReviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
});

export class ModerateReviewDto extends createZodDto(moderateReviewSchema) {}
