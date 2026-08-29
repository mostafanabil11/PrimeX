import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { GENDERS } from '@/auth/schemas/user.schema';

// Name is required because an account always has one. Everything a member
// adds later is optional and patched — sending only what changed, so editing
// a phone number does not blank an emergency contact.
export const updateProfileSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50),
  lastName: z.string().min(1, 'Last name is required').max(50),

  phone: z.string().trim().max(30).nullish(),
  dateOfBirth: z.iso.date().nullish(),
  gender: z.enum(GENDERS).nullish(),

  emergencyContactName: z.string().trim().max(120).nullish(),
  emergencyContactPhone: z.string().trim().max(30).nullish(),
  emergencyContactRelationship: z.string().trim().max(60).nullish(),

  fitnessGoals: z.array(z.string().trim().min(1).max(120)).max(10).optional(),
  // Sensitive: injuries, conditions, medication. Only the member and the staff
  // keeping them safe ever read it — see the privacy policy.
  medicalNotes: z.string().trim().max(2000).nullish(),

  // Opt-outs. Transactional mail — receipts, expiry warnings, a class the gym
  // cancelled — always sends regardless of these.
  emailClassReminders: z.boolean().optional(),
  emailMarketing: z.boolean().optional(),
});

export class UpdateProfileDto extends createZodDto(updateProfileSchema) {}
