import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Trainer, TrainerDocument } from './schemas/trainer.schema';
import { Branch, BranchDocument } from '@/branches/schemas/branch.schema';
import { CreateTrainerDto, UpdateTrainerDto } from './dto';
import { slugify } from '@/common/utils/slugify.util';
import { ensureUniqueSlug, definedFieldsOnly } from '@/common/utils/unique-slug.util';

@Injectable()
export class TrainersService {
  constructor(
    @InjectModel(Trainer.name) private trainerModel: Model<TrainerDocument>,
    @InjectModel(Branch.name) private branchModel: Model<BranchDocument>
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid trainer id');
    }
    return new Types.ObjectId(id);
  }

  // One query rather than one per id. A trainer attached to a branch that does
  // not exist would quietly disappear from that branch page, which is the kind
  // of bug nobody reports because it looks like nothing.
  private async assertBranchesExist(ids: string[]): Promise<void> {
    if (ids.length === 0) {
      return;
    }

    const unique = [...new Set(ids)];
    const found = await this.branchModel.countDocuments({ _id: { $in: unique } });
    if (found !== unique.length) {
      throw new BadRequestException('One or more branches do not exist');
    }
  }

  async create(dto: CreateTrainerDto) {
    const baseSlug = dto.slug || slugify(dto.name);
    if (!baseSlug) {
      throw new BadRequestException('Trainer name must contain at least one letter or number');
    }

    await this.assertBranchesExist(dto.branches ?? []);

    const trainer = await this.trainerModel.create({
      ...dto,
      slug: await ensureUniqueSlug(this.trainerModel, baseSlug),
    });

    return {
      success: true,
      message: 'Trainer created successfully',
      data: trainer,
    };
  }

  async findAll(branchId?: string) {
    const query: Record<string, unknown> = { isActive: true };
    if (branchId) {
      if (!Types.ObjectId.isValid(branchId)) {
        throw new BadRequestException('Invalid branch id');
      }
      query.branches = new Types.ObjectId(branchId);
    }

    const trainers = await this.trainerModel
      .find(query)
      .sort({ sortOrder: 1, name: 1 })
      .populate('branches', 'name slug city')
      .lean();

    return {
      success: true,
      message: 'Trainers retrieved successfully',
      data: trainers,
    };
  }

  async findAllAdmin() {
    const trainers = await this.trainerModel
      .find()
      .sort({ sortOrder: 1, name: 1 })
      .populate('branches', 'name slug city')
      .lean();

    return {
      success: true,
      message: 'Trainers retrieved successfully',
      data: trainers,
    };
  }

  async findBySlug(slug: string) {
    const trainer = await this.trainerModel
      .findOne({ slug, isActive: true })
      .populate('branches', 'name slug city')
      .lean();

    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }

    return {
      success: true,
      message: 'Trainer retrieved successfully',
      data: trainer,
    };
  }

  async findOneAdmin(id: string) {
    const trainer = await this.trainerModel.findById(this.toObjectId(id)).lean();
    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }

    return {
      success: true,
      message: 'Trainer retrieved successfully',
      data: trainer,
    };
  }

  async update(id: string, dto: UpdateTrainerDto) {
    const objectId = this.toObjectId(id);
    const existing = await this.trainerModel.findById(objectId);
    if (!existing) {
      throw new NotFoundException('Trainer not found');
    }

    if (dto.branches) {
      await this.assertBranchesExist(dto.branches);
    }

    const update = definedFieldsOnly(dto);

    const wantsNewSlug = dto.slug !== undefined || (dto.name !== undefined && !dto.slug);
    if (wantsNewSlug) {
      const baseSlug = dto.slug || slugify(dto.name ?? existing.name);
      if (!baseSlug) {
        throw new BadRequestException('Trainer name must contain at least one letter or number');
      }
      update.slug = await ensureUniqueSlug(this.trainerModel, baseSlug, id);
    }

    const trainer = await this.trainerModel.findByIdAndUpdate(
      objectId,
      { $set: update },
      { new: true }
    );

    return {
      success: true,
      message: 'Trainer updated successfully',
      data: trainer,
    };
  }

  // Deactivates rather than deletes: past sessions and bookings name the
  // trainer who actually took them, and that record should survive someone
  // leaving.
  async deactivate(id: string) {
    const trainer = await this.trainerModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: { isActive: false } },
      { new: true }
    );

    if (!trainer) {
      throw new NotFoundException('Trainer not found');
    }

    return {
      success: true,
      message: 'Trainer deactivated successfully',
      data: trainer,
    };
  }
}
