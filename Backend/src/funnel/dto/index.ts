import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { CTA_CLICK_KINDS } from '../schemas/cta-click.schema';

const OBJECT_ID = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Not a valid id');

export const ctaClickSchema = z.object({
  kind: z.enum(CTA_CLICK_KINDS),

  planId: OBJECT_ID.nullish(),

  // A UUID the browser generates once and keeps in localStorage. Never stored
  // as given — it is hashed into dedupeKey — and never treated as identity:
  // clearing site data mints a new one, which is exactly the privacy property
  // wanted here. See the note on dedupeKey about why this is not an IP.
  clientId: z.string().trim().min(8).max(64),
});

export class CtaClickDto extends createZodDto(ctaClickSchema) {}
