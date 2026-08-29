import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { ClassType, ClassTypeDocument } from './schemas/class-type.schema';
import { CreateClassTypeDto, UpdateClassTypeDto } from './dto';
import { slugify } from '@/common/utils/slugify.util';
import { ensureUniqueSlug, definedFieldsOnly } from '@/common/utils/unique-slug.util';

@Injectable()
export class ClassTypesService {
  constructor(@InjectModel(ClassType.name) private classTypeModel: Model<ClassTypeDocument>) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid class type id');
    }
    return new Types.ObjectId(id);
  }

  async create(dto: CreateClassTypeDto) {
    const baseSlug = dto.slug || slugify(dto.name);
    if (!baseSlug) {
      throw new BadRequestException('Class name must contain at least one letter or number');
    }

    const classType = await this.classTypeModel.create({
      ...dto,
      slug: await ensureUniqueSlug(this.classTypeModel, baseSlug),
    });

    return {
      success: true,
      message: 'Class type created successfully',
      data: classType,
    };
  }

  async findAll() {
    const classTypes = await this.classTypeModel
      .find({ isActive: true })
      .sort({ sortOrder: 1, name: 1 })
      .lean();

    return {
      success: true,
      message: 'Class types retrieved successfully',
      data: classTypes,
    };
  }

  async findAllAdmin() {
    const classTypes = await this.classTypeModel.find().sort({ sortOrder: 1, name: 1 }).lean();

    return {
      success: true,
      message: 'Class types retrieved successfully',
      data: classTypes,
    };
  }

  async findBySlug(slug: string) {
    const classType = await this.classTypeModel.findOne({ slug, isActive: true }).lean();
    if (!classType) {
      throw new NotFoundException('Class type not found');
    }

    return {
      success: true,
      message: 'Class type retrieved successfully',
      data: classType,
    };
  }

  async findOneAdmin(id: string) {
    const classType = await this.classTypeModel.findById(this.toObjectId(id)).lean();
    if (!classType) {
      throw new NotFoundException('Class type not found');
    }

    return {
      success: true,
      message: 'Class type retrieved successfully',
      data: classType,
    };
  }

  async update(id: string, dto: UpdateClassTypeDto) {
    const objectId = this.toObjectId(id);
    const existing = await this.classTypeModel.findById(objectId);
    if (!existing) {
      throw new NotFoundException('Class type not found');
    }

    const update = definedFieldsOnly(dto);

    const wantsNewSlug = dto.slug !== undefined || (dto.name !== undefined && !dto.slug);
    if (wantsNewSlug) {
      const baseSlug = dto.slug || slugify(dto.name ?? existing.name);
      if (!baseSlug) {
        throw new BadRequestException('Class name must contain at least one letter or number');
      }
      update.slug = await ensureUniqueSlug(this.classTypeModel, baseSlug, id);
    }

    const classType = await this.classTypeModel.findByIdAndUpdate(
      objectId,
      { $set: update },
      { new: true }
    );

    return {
      success: true,
      message: 'Class type updated successfully',
      data: classType,
    };
  }

  // Deactivates rather than deletes. Retiring a class from the timetable must
  // not erase the sessions members already attended, and those sessions point
  // here for their name and description.
  async deactivate(id: string) {
    const classType = await this.classTypeModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: { isActive: false } },
      { new: true }
    );

    if (!classType) {
      throw new NotFoundException('Class type not found');
    }

    return {
      success: true,
      message: 'Class type deactivated successfully',
      data: classType,
    };
  }
}
