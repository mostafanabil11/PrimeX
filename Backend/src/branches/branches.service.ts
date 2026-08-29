import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Branch, BranchDocument } from './schemas/branch.schema';
import { CreateBranchDto, UpdateBranchDto } from './dto';
import { slugify } from '@/common/utils/slugify.util';
import { ensureUniqueSlug, definedFieldsOnly } from '@/common/utils/unique-slug.util';

@Injectable()
export class BranchesService {
  constructor(@InjectModel(Branch.name) private branchModel: Model<BranchDocument>) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid branch id');
    }
    return new Types.ObjectId(id);
  }

  async create(dto: CreateBranchDto) {
    const baseSlug = dto.slug || slugify(dto.name);
    if (!baseSlug) {
      throw new BadRequestException('Branch name must contain at least one letter or number');
    }

    const branch = await this.branchModel.create({
      ...dto,
      slug: await ensureUniqueSlug(this.branchModel, baseSlug),
    });

    return {
      success: true,
      message: 'Branch created successfully',
      data: branch,
    };
  }

  // Public listing: active branches only, in the order an admin arranged them.
  async findAll() {
    const branches = await this.branchModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return {
      success: true,
      message: 'Branches retrieved successfully',
      data: branches,
    };
  }

  // Same query without the isActive term, so an admin can see and reactivate
  // a branch they have hidden from the site.
  async findAllAdmin() {
    const branches = await this.branchModel.find().sort({ sortOrder: 1, name: 1 }).lean();

    return {
      success: true,
      message: 'Branches retrieved successfully',
      data: branches,
    };
  }

  async findBySlug(slug: string) {
    const branch = await this.branchModel.findOne({ slug, isActive: true }).lean();
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return {
      success: true,
      message: 'Branch retrieved successfully',
      data: branch,
    };
  }

  async findOneAdmin(id: string) {
    const branch = await this.branchModel.findById(this.toObjectId(id)).lean();
    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return {
      success: true,
      message: 'Branch retrieved successfully',
      data: branch,
    };
  }

  async update(id: string, dto: UpdateBranchDto) {
    const objectId = this.toObjectId(id);
    const existing = await this.branchModel.findById(objectId);
    if (!existing) {
      throw new NotFoundException('Branch not found');
    }

    // Strip undefined before building the $set. Zod omits absent optional
    // keys, so this is belt-and-braces — but a single stray undefined here
    // becomes a $set that erases a field, and that failure is silent.
    const update: Record<string, unknown> = definedFieldsOnly(dto);

    // Only re-slug when the admin asked for it, either by sending a slug or by
    // renaming the branch. Silently changing a slug on any other edit would
    // break every link and search result already pointing at the old one.
    const wantsNewSlug = dto.slug !== undefined || (dto.name !== undefined && !dto.slug);
    if (wantsNewSlug) {
      const baseSlug = dto.slug || slugify(dto.name ?? existing.name);
      if (!baseSlug) {
        throw new BadRequestException('Branch name must contain at least one letter or number');
      }
      update.slug = await ensureUniqueSlug(this.branchModel, baseSlug, id);
    }

    const branch = await this.branchModel.findByIdAndUpdate(
      objectId,
      { $set: update },
      { new: true }
    );

    return {
      success: true,
      message: 'Branch updated successfully',
      data: branch,
    };
  }

  // Deactivates rather than deletes. Sessions, subscriptions and check-ins all
  // reference a branch; removing the document would leave those pointing at
  // nothing and rewrite history that actually happened.
  async deactivate(id: string) {
    const branch = await this.branchModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: { isActive: false } },
      { new: true }
    );

    if (!branch) {
      throw new NotFoundException('Branch not found');
    }

    return {
      success: true,
      message: 'Branch deactivated successfully',
      data: branch,
    };
  }

  // Used by other gym modules to validate a branch reference before storing
  // it. Returns the id so callers can assign it directly.
  async assertExists(id: string): Promise<Types.ObjectId> {
    const objectId = this.toObjectId(id);
    const exists = await this.branchModel.exists({ _id: objectId });
    if (!exists) {
      throw new NotFoundException('Branch not found');
    }
    return objectId;
  }
}
