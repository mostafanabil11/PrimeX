import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';

/**
 * Creating a front-desk account.
 *
 * No role field, deliberately. These endpoints only ever produce 'staff' — a
 * role that arrived in a request body is the classic privilege-escalation
 * bug, and making an admin stays a shell operation
 * (scripts/set-admin-password.js) so it cannot be done through a stolen
 * session.
 *
 * No password field either: the server generates one and returns it once.
 */
export const createStaffSchema = z.object({
  firstName: z.string().trim().min(1, 'We need a first name').max(60),
  lastName: z.string().trim().min(1, 'We need a last name').max(60),

  // The login identifier. It never has to receive mail — the account is
  // created verified and the password is handed over in person — so an
  // internal address like sara@yourgym.eg is fine. It only has to be unique.
  email: z.email('That does not look like an email address').max(200),
});

export class CreateStaffDto extends createZodDto(createStaffSchema) {}

export const updateStaffSchema = z.object({
  isActive: z.boolean(),
});

export class UpdateStaffDto extends createZodDto(updateStaffSchema) {}
