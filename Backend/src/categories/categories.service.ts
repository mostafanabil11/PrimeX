import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Category, CategoryDocument } from './schemas/category.schema';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { ReorderCategoriesDto } from './dto/reorder-categories.dto';
import { slugify } from '@/common/utils/slugify.util';
import { escapeRegex } from '@/common/utils/regex.util';
import { Product, ProductDocument } from '@/products/schemas/product.schema';

@Injectable()
export class CategoriesService {
  constructor(
    @InjectModel(Category.name) private categoryModel: Model<CategoryDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  private async resolveParent(parentId?: string | null): Promise<Types.ObjectId | null> {
    if (!parentId) {
      return null;
    }

    if (!Types.ObjectId.isValid(parentId)) {
      throw new BadRequestException('Invalid parent category id');
    }

    const parent = await this.categoryModel.findById(parentId);
    if (!parent) {
      throw new NotFoundException('Parent category not found');
    }

    return parent._id as Types.ObjectId;
  }

  private async ensureUniqueSlug(
    baseSlug: string,
    parent: Types.ObjectId | null,
    excludeId?: string
  ): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const query: Record<string, unknown> = { slug, parent };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existing = await this.categoryModel.findOne(query);
      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  async create(dto: CreateCategoryDto) {
    const parent = await this.resolveParent(dto.parent);
    const baseSlug = slugify(dto.name);
    if (!baseSlug) {
      throw new BadRequestException('Category name must contain at least one letter or number');
    }
    const slug = await this.ensureUniqueSlug(baseSlug, parent);

    const category = new this.categoryModel({
      name: dto.name,
      slug,
      parent,
      image: dto.image ?? null,
      description: dto.description ?? null,
      displayOrder: dto.displayOrder ?? 0,
      isFeaturedOnHome: dto.isFeaturedOnHome ?? false,
    });

    await category.save();

    return {
      success: true,
      message: 'Category created successfully',
      data: category,
    };
  }

  async update(id: string, dto: UpdateCategoryDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category id');
    }

    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    let parent = category.parent;
    if (dto.parent !== undefined) {
      if (dto.parent === id) {
        throw new BadRequestException('A category cannot be its own parent');
      }
      parent = await this.resolveParent(dto.parent);
    }

    if (dto.name !== undefined || parent !== category.parent) {
      const baseSlug = slugify(dto.name ?? category.name);
      category.slug = await this.ensureUniqueSlug(baseSlug, parent, id);
    }

    if (dto.name !== undefined) category.name = dto.name;
    category.parent = parent;
    if (dto.image !== undefined) category.image = dto.image;
    if (dto.description !== undefined) category.description = dto.description;
    if (dto.displayOrder !== undefined) category.displayOrder = dto.displayOrder;
    if (dto.isFeaturedOnHome !== undefined) category.isFeaturedOnHome = dto.isFeaturedOnHome;
    if (dto.isActive !== undefined) category.isActive = dto.isActive;

    await category.save();

    return {
      success: true,
      message: 'Category updated successfully',
      data: category,
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category id');
    }

    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const childCount = await this.categoryModel.countDocuments({ parent: category._id });
    if (childCount > 0) {
      throw new ConflictException(
        'This category still has subcategories. Delete or reassign them first, or deactivate it instead of deleting.'
      );
    }

    const productCount = await this.productModel.countDocuments({
      category: category._id,
      isActive: true,
    });
    if (productCount > 0) {
      throw new ConflictException(
        'This category still has active products assigned to it. Reassign or deactivate them first, or deactivate the category instead of deleting.'
      );
    }

    await category.deleteOne();

    return {
      success: true,
      message: 'Category deleted successfully',
      data: null,
    };
  }

  async reorder(dto: ReorderCategoriesDto) {
    const invalidId = dto.items.find(item => !Types.ObjectId.isValid(item.id));
    if (invalidId) {
      throw new BadRequestException(`Invalid category id: ${invalidId.id}`);
    }

    // One round trip instead of N independent updateOne calls — shrinks the
    // window where a concurrent read could see a half-applied order, and
    // `ordered: true` stops at the first failure instead of every other
    // update firing regardless. Promise.all(updateOne) also silently
    // no-op'd on an id that didn't exist; matchedCount below now catches that.
    const result = await this.categoryModel.bulkWrite(
      dto.items.map(item => ({
        updateOne: {
          filter: { _id: item.id },
          update: { $set: { displayOrder: item.displayOrder } },
        },
      })),
      { ordered: true }
    );

    if (result.matchedCount !== dto.items.length) {
      throw new BadRequestException('One or more category ids were not found');
    }

    return {
      success: true,
      message: 'Categories reordered successfully',
      data: null,
    };
  }

  async findTree() {
    const categories = await this.categoryModel
      .find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const byParent = new Map<string, typeof categories>();
    for (const category of categories) {
      const key = category.parent ? category.parent.toString() : 'root';
      const bucket = byParent.get(key) ?? [];
      bucket.push(category);
      byParent.set(key, bucket);
    }

    const buildBranch = (parentKey: string): any[] =>
      (byParent.get(parentKey) ?? []).map(category => ({
        ...category,
        children: buildBranch((category._id as Types.ObjectId).toString()),
      }));

    return {
      success: true,
      message: 'Categories retrieved successfully',
      data: buildBranch('root'),
    };
  }

  // Same shape as findTree but includes inactive categories — the storefront
  // tree hides them, but an admin editing the catalog needs to see (and
  // reactivate) a deactivated category, not have it silently vanish.
  async findTreeAdmin() {
    const categories = await this.categoryModel.find({}).sort({ displayOrder: 1, name: 1 }).lean();

    const byParent = new Map<string, typeof categories>();
    for (const category of categories) {
      const key = category.parent ? category.parent.toString() : 'root';
      const bucket = byParent.get(key) ?? [];
      bucket.push(category);
      byParent.set(key, bucket);
    }

    const buildBranch = (parentKey: string): any[] =>
      (byParent.get(parentKey) ?? []).map(category => ({
        ...category,
        children: buildBranch((category._id as Types.ObjectId).toString()),
      }));

    return {
      success: true,
      message: 'Categories retrieved successfully',
      data: buildBranch('root'),
    };
  }

  async findFeatured() {
    const categories = await this.categoryModel
      .find({ isActive: true, isFeaturedOnHome: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    return {
      success: true,
      message: 'Featured categories retrieved successfully',
      data: categories,
    };
  }

  async findTopLevelBySlug(slug: string) {
    const category = await this.categoryModel.findOne({ slug, parent: null, isActive: true });
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    const children = await this.categoryModel
      .find({ parent: category._id, isActive: true })
      .sort({ displayOrder: 1, name: 1 });

    return {
      success: true,
      message: 'Category retrieved successfully',
      data: { ...category.toObject(), children },
    };
  }

  async findByIdOrThrow(id: string): Promise<CategoryDocument> {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid category id');
    }

    const category = await this.categoryModel.findById(id);
    if (!category) {
      throw new NotFoundException('Category not found');
    }

    return category;
  }

  // Returns the category's own id plus its children's ids (if any), so
  // filtering products by a top-level category (e.g. "Men") automatically
  // includes products from all of its subcategories.
  async resolveIdWithDescendants(id: string): Promise<Types.ObjectId[]> {
    const category = await this.findByIdOrThrow(id);
    const children = await this.categoryModel.find({ parent: category._id }, '_id');
    const childIds = children.map(child => child._id as Types.ObjectId);
    return [category._id as Types.ObjectId, ...childIds];
  }

  // Finds categories whose name matches the search term, plus (for any matched
  // top-level category, e.g. "Men") its children — so a product search for
  // "pants" or "t-shirt" also surfaces products filed under that category even
  // when the term doesn't literally appear in the product's own name.
  async findIdsByNameMatch(term: string): Promise<Types.ObjectId[]> {
    const regex = new RegExp(escapeRegex(term), 'i');
    const matches = await this.categoryModel.find({ name: regex, isActive: true }, '_id parent');
    if (matches.length === 0) {
      return [];
    }

    const ids = new Set<string>(matches.map(m => (m._id as Types.ObjectId).toString()));

    const topLevelIds = matches.filter(m => m.parent === null).map(m => m._id as Types.ObjectId);
    if (topLevelIds.length > 0) {
      const children = await this.categoryModel.find({ parent: { $in: topLevelIds } }, '_id');
      children.forEach(child => ids.add((child._id as Types.ObjectId).toString()));
    }

    return [...ids].map(id => new Types.ObjectId(id));
  }

  async findChildBySlug(parentSlug: string, childSlug: string) {
    const parent = await this.categoryModel.findOne({
      slug: parentSlug,
      parent: null,
      isActive: true,
    });
    if (!parent) {
      throw new NotFoundException('Category not found');
    }

    const child = await this.categoryModel.findOne({
      slug: childSlug,
      parent: parent._id,
      isActive: true,
    });
    if (!child) {
      throw new NotFoundException('Category not found');
    }

    return {
      success: true,
      message: 'Category retrieved successfully',
      data: child,
    };
  }
}
