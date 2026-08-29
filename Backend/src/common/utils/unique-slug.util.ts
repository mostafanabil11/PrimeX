import { Model } from 'mongoose';

/**
 * Finds a free slug by appending -2, -3 … to the base until nothing collides.
 *
 * Appending rather than rejecting is deliberate: two branches can genuinely be
 * called "Downtown", and two plans "Student", so making an admin invent a
 * unique slug by hand would be friction with no benefit.
 *
 * Pass excludeId when updating, so a document does not collide with itself and
 * get renamed to name-2 on every save.
 */
export async function ensureUniqueSlug(
  model: Model<any>,
  baseSlug: string,
  excludeId?: string
): Promise<string> {
  let slug = baseSlug;
  let suffix = 2;

  for (;;) {
    const query: Record<string, unknown> = { slug };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existing = await model.findOne(query).select('_id').lean();
    if (!existing) {
      return slug;
    }

    slug = `${baseSlug}-${suffix}`;
    suffix += 1;
  }
}

/**
 * Drops keys whose value is undefined, so a PATCH never $sets a field to
 * nothing. Zod already omits absent optional keys; this is the second line of
 * defence, because the failure mode is silent data loss rather than an error.
 */
export function definedFieldsOnly(dto: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(dto).filter(([, value]) => value !== undefined));
}
