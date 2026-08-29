import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { branchFields } from './create-branch.dto';

// Built from branchFields rather than from createBranchSchema so it inherits
// the shape but nothing else. See the note in create-branch.dto.ts on why no
// field in that object may carry a .default().
export const updateBranchSchema = z.object(branchFields).partial();

export class UpdateBranchDto extends createZodDto(updateBranchSchema) {}
