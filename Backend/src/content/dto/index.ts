import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

const OBJECT_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');

// --- Content blocks ---
//
// The key is validated against the registry in the service rather than as an
// enum here, so adding a key is a one-file change and the error message can
// say which keys are actually available.
export const updateContentBlocksSchema = z.object({
  blocks: z
    .array(
      z
        .object({
          key: z.string().trim().min(1).max(120),
          value: z.string().max(5000).nullish(),
          values: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
          valueAr: z.string().max(5000).nullish(),
          valuesAr: z.array(z.string().trim().min(1).max(500)).max(30).optional(),
        })
        .refine(b => b.value !== undefined || b.values !== undefined || b.valueAr !== undefined || b.valuesAr !== undefined, {
          message: 'Send at least one English or Arabic value',
        })
    )
    .min(1)
    .max(100),
});

export class UpdateContentBlocksDto extends createZodDto(updateContentBlocksSchema) {}

// --- Testimonials ---

// No .default() — see branches/dto/create-branch.dto.ts.
export const testimonialFields = {
  name: z.string().trim().min(1, 'Name is required').max(120),
  quote: z.string().trim().min(1, 'Quote is required').max(1000),
  photo: z.string().trim().max(500).nullish(),
  attribution: z.string().trim().max(160).nullish(),
  rating: z.number().int().min(1).max(5).nullish(),
  branch: OBJECT_ID.nullish(),
  sortOrder: z.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
};

export const createTestimonialSchema = z.object(testimonialFields);
export const updateTestimonialSchema = z.object(testimonialFields).partial();

export class CreateTestimonialDto extends createZodDto(createTestimonialSchema) {}
export class UpdateTestimonialDto extends createZodDto(updateTestimonialSchema) {}
