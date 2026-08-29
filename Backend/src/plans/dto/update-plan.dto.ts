import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { planFields } from './create-plan.dto';

// The cross-field discount rule cannot live here: a patch that sends only
// discountPriceMinorUnits has no price to compare against. PlansService
// re-checks it against the stored document instead.
export const updatePlanSchema = z.object(planFields).partial();

export class UpdatePlanDto extends createZodDto(updatePlanSchema) {}
