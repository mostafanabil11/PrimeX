import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { FilterQuery, Model, Types } from 'mongoose';
import { Product, ProductDocument } from './schemas/product.schema';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { ProductQueryDto } from './dto/product-query.dto';
import { slugify } from '@/common/utils/slugify.util';
import { escapeRegex } from '@/common/utils/regex.util';
import { CategoriesService } from '@/categories/categories.service';
import { ProductSize } from './schemas/product-size-stock.schema';
import {
  StockMovement,
  StockMovementDocument,
  StockMovementReason,
} from './schemas/stock-movement.schema';
import { EventEmitter2 } from '@nestjs/event-emitter';

export interface StockLine {
  productId: string;
  size: ProductSize;
  quantity: number;
}

export interface StockMovementContext {
  reason: StockMovementReason;
  reference?: string | null;
}

@Injectable()
export class ProductsService {
  constructor(
    @InjectModel(Product.name) private productModel: Model<ProductDocument>,
    @InjectModel(StockMovement.name) private stockMovementModel: Model<StockMovementDocument>,
    private categoriesService: CategoriesService,
    private eventEmitter: EventEmitter2
  ) {}

  private async ensureUniqueSlug(baseSlug: string, excludeId?: string): Promise<string> {
    let slug = baseSlug;
    let suffix = 2;

    while (true) {
      const query: Record<string, unknown> = { slug };
      if (excludeId) {
        query._id = { $ne: excludeId };
      }

      const existing = await this.productModel.findOne(query);
      if (!existing) {
        return slug;
      }

      slug = `${baseSlug}-${suffix}`;
      suffix += 1;
    }
  }

  // ensureUniqueSlug's pre-check is a check-then-write race: two concurrent
  // creates of the same product name can both see the slug as free and both
  // attempt to save it. The unique index is the real authority — this lets a
  // save that loses that race retry with a fresh slug (by which point the
  // winner's document is visible, so the next ensureUniqueSlug call sees it)
  // instead of surfacing a raw duplicate-key error to the client.
  private isDuplicateSlugError(err: unknown): boolean {
    return (
      err instanceof Error &&
      err.name === 'MongoServerError' &&
      (err as Error & { code?: number }).code === 11000 &&
      Object.keys(
        (err as Error & { keyPattern?: Record<string, unknown> }).keyPattern ?? {}
      ).includes('slug')
    );
  }

  private async saveWithUniqueSlug(
    product: ProductDocument,
    baseSlug: string,
    excludeId?: string,
    maxAttempts = 10
  ): Promise<void> {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await product.save();
        return;
      } catch (err) {
        if (!this.isDuplicateSlugError(err) || attempt === maxAttempts) {
          throw err;
        }
        product.slug = await this.ensureUniqueSlug(baseSlug, excludeId);
      }
    }
  }

  private async validateCategory(categoryId: string) {
    const category = await this.categoriesService.findByIdOrThrow(categoryId);
    if (category.parent === null) {
      throw new BadRequestException(
        'Products must be assigned to a subcategory (e.g. "Men > Hoodies"), not a top-level category like "Men".'
      );
    }
    return category;
  }

  private validatePricing(price: number, discountPrice?: number | null) {
    if (discountPrice != null && discountPrice >= price) {
      throw new BadRequestException('Discount price must be lower than the regular price');
    }
  }

  async create(dto: CreateProductDto) {
    const category = await this.validateCategory(dto.category);
    this.validatePricing(dto.price, dto.discountPrice);

    const baseSlug = slugify(dto.name);
    if (!baseSlug) {
      throw new BadRequestException('Product name must contain at least one letter or number');
    }
    const slug = await this.ensureUniqueSlug(baseSlug);

    const product = new this.productModel({
      name: dto.name,
      slug,
      description: dto.description ?? null,
      color: dto.color,
      styleGroup: dto.styleGroup ? slugify(dto.styleGroup) : null,
      category: category._id,
      price: dto.price,
      discountPrice: dto.discountPrice ?? null,
      images: dto.images,
      sizes: dto.sizes,
      isBestSeller: dto.isBestSeller ?? false,
    });

    await this.saveWithUniqueSlug(product, baseSlug);

    return {
      success: true,
      message: 'Product created successfully',
      data: product,
    };
  }

  async update(id: string, dto: UpdateProductDto) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product id');
    }

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let categoryId = product.category;
    if (dto.category !== undefined) {
      const category = await this.validateCategory(dto.category);
      categoryId = category._id as Types.ObjectId;
    }

    const nextPrice = dto.price ?? product.price;
    const nextDiscountPrice =
      dto.discountPrice !== undefined ? dto.discountPrice : product.discountPrice;
    this.validatePricing(nextPrice, nextDiscountPrice);

    let baseSlug: string | null = null;
    if (dto.name !== undefined) {
      baseSlug = slugify(dto.name);
      if (!baseSlug) {
        throw new BadRequestException('Product name must contain at least one letter or number');
      }
      product.slug = await this.ensureUniqueSlug(baseSlug, id);
      product.name = dto.name;
    }

    product.category = categoryId;
    if (dto.description !== undefined) product.description = dto.description;
    if (dto.color !== undefined) product.color = dto.color;
    if (dto.styleGroup !== undefined) {
      product.styleGroup = dto.styleGroup ? slugify(dto.styleGroup) : null;
    }
    if (dto.price !== undefined) product.price = dto.price;
    if (dto.discountPrice !== undefined) product.discountPrice = dto.discountPrice;
    if (dto.images !== undefined) product.images = dto.images;
    if (dto.sizes !== undefined) product.sizes = dto.sizes;
    if (dto.isBestSeller !== undefined) product.isBestSeller = dto.isBestSeller;
    if (dto.isActive !== undefined) product.isActive = dto.isActive;

    // Only the name-change path touches slug, so only it can race another
    // create/rename onto the same slug — anything else is a plain save.
    if (baseSlug) {
      await this.saveWithUniqueSlug(product, baseSlug, id);
    } else {
      await product.save();
    }

    return {
      success: true,
      message: 'Product updated successfully',
      data: product,
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product id');
    }

    const product = await this.productModel.findById(id);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Soft delete: once orders exist, an order line references a product by
    // id — hard-deleting it would silently corrupt that order's history and
    // any past-revenue reporting built on it. Deactivating just drops it
    // from customer-facing listings (findAll/findBestSellers/findBySlug all
    // filter on isActive already) while every reference stays resolvable.
    product.isActive = false;
    await product.save();

    return {
      success: true,
      message: 'Product deactivated successfully',
      data: null,
    };
  }

  private async buildProductFilter(
    query: ProductQueryDto,
    includeInactive: boolean
  ): Promise<FilterQuery<ProductDocument>> {
    const filter: FilterQuery<ProductDocument> = includeInactive ? {} : { isActive: true };

    if (query.category) {
      const categoryIds = await this.categoriesService.resolveIdWithDescendants(query.category);
      filter.category = { $in: categoryIds };
    }

    if (query.size) {
      filter.sizes = { $elemMatch: { size: query.size, stock: { $gt: 0 } } };
    }

    if (query.color) {
      filter.color = new RegExp(`^${escapeRegex(query.color)}$`, 'i');
    }

    if (query.minPrice !== undefined || query.maxPrice !== undefined) {
      filter.price = {
        ...(query.minPrice !== undefined ? { $gte: query.minPrice } : {}),
        ...(query.maxPrice !== undefined ? { $lte: query.maxPrice } : {}),
      };
    }

    if (query.onSale) {
      filter.discountPrice = { $ne: null };
    }

    if (query.q) {
      // Backed by the text index on name/description/color — indexed word
      // matching instead of a full-collection regex scan. Still OR'd with
      // a category-name match so e.g. searching "pants" surfaces products
      // filed under that category even when the word isn't in the product's
      // own name.
      const matchingCategoryIds = await this.categoriesService.findIdsByNameMatch(query.q);
      filter.$or = [
        { $text: { $search: query.q } },
        ...(matchingCategoryIds.length > 0 ? [{ category: { $in: matchingCategoryIds } }] : []),
      ];
    }

    return filter;
  }

  private buildProductSort(sort?: ProductQueryDto['sort']): Record<string, 1 | -1> {
    if (sort === 'price_asc') return { price: 1 };
    if (sort === 'price_desc') return { price: -1 };
    return { createdAt: -1 };
  }

  async findAll(query: ProductQueryDto) {
    const filter = await this.buildProductFilter(query, false);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const sort = this.buildProductSort(query.sort);

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug'),
      this.productModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // Same filters as findAll, but includes deactivated products and skips
  // nothing — the storefront intentionally hides inactive products, but an
  // admin managing inventory needs to see (and reactivate) them.
  async findAllAdmin(query: ProductQueryDto) {
    const filter = await this.buildProductFilter(query, true);

    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const skip = (page - 1) * limit;
    const sort = this.buildProductSort(query.sort);

    const [items, total] = await Promise.all([
      this.productModel
        .find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .populate('category', 'name slug'),
      this.productModel.countDocuments(filter),
    ]);

    return {
      success: true,
      message: 'Products retrieved successfully',
      data: items,
      pagination: { page, limit, total, pages: Math.ceil(total / limit) },
    };
  }

  // Lightweight autocomplete: prefix-anchored on name, not the stemmed
  // $text index findAll uses — shoppers typing "hood" expect "Hoodie"
  // matches immediately, before they've typed a complete indexable word.
  async suggest(q: string, limit = 6) {
    const regex = new RegExp(`^${escapeRegex(q)}`, 'i');
    const items = await this.productModel
      .find({ isActive: true, name: regex })
      .select('name slug images price discountPrice')
      .limit(limit);

    return {
      success: true,
      message: 'Suggestions retrieved',
      data: items,
    };
  }

  // Feeds the storefront's color filter dropdown — distinct values actually
  // in use, not a hardcoded list that drifts from the catalog.
  async listDistinctColors(): Promise<string[]> {
    const colors = await this.productModel.distinct('color', { isActive: true });
    return (colors as string[]).sort((a, b) => a.localeCompare(b));
  }

  async findBestSellers(limit = 8) {
    const items = await this.productModel
      .find({ isActive: true, isBestSeller: true })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('category', 'name slug');

    return {
      success: true,
      message: 'Best sellers retrieved successfully',
      data: items,
    };
  }

  // Admin edit screens navigate by _id (the list they came from has no
  // reason to expose slugs), so this exists alongside findBySlug rather than
  // forcing the admin UI to look up a slug just to then look up the product.
  async findByIdAdmin(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid product id');
    }
    const product = await this.productModel.findById(id).populate('category', 'name slug parent');
    if (!product) {
      throw new NotFoundException('Product not found');
    }
    return {
      success: true,
      message: 'Product retrieved successfully',
      data: product,
    };
  }

  async findBySlug(slug: string) {
    const product = await this.productModel
      .findOne({ slug, isActive: true })
      .populate('category', 'name slug parent');
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    let relatedColors: unknown[] = [];
    if (product.styleGroup) {
      relatedColors = await this.productModel
        .find({
          styleGroup: product.styleGroup,
          isActive: true,
          _id: { $ne: product._id },
        })
        .select('name slug color images')
        .lean();
    }

    // Same category, different style — the "you might also like" rail.
    // Excludes styleGroup siblings (already shown as colorways above) so the
    // two rails never duplicate the same product.
    const relatedProducts = await this.productModel
      .find({
        category: (product.category as any)?._id ?? product.category,
        isActive: true,
        _id: { $ne: product._id },
        ...(product.styleGroup ? { styleGroup: { $ne: product.styleGroup } } : {}),
      })
      .select('name slug color images price discountPrice')
      .limit(8)
      .lean();

    return {
      success: true,
      message: 'Product retrieved successfully',
      data: { ...product.toObject(), relatedColors, relatedProducts },
    };
  }

  // The conditional filter (stock: {$gte: quantity}) and the $inc happen in
  // one atomic MongoDB operation — no read-check-write race window. Two
  // concurrent decrements against the last unit of stock cannot both
  // succeed: whichever the database serializes second sees a filter that no
  // longer matches and gets modifiedCount 0, not a negative stock value.
  // findOneAndUpdate (not updateOne) so the post-update stock value comes
  // back for free, for the ledger entry below — no second query.
  async decrementStock(
    productId: string,
    size: ProductSize,
    quantity: number,
    context: StockMovementContext
  ): Promise<boolean> {
    const updated = await this.productModel.findOneAndUpdate(
      { _id: productId, sizes: { $elemMatch: { size, stock: { $gte: quantity } } } },
      { $inc: { 'sizes.$.stock': -quantity } },
      { new: true }
    );
    if (!updated) {
      return false;
    }

    await this.recordStockMovement(productId, size, -quantity, updated, context);
    return true;
  }

  // The inverse — used both for rolling back a same-order decrement that
  // hit a stock-out on a later line, and later for order cancellation/refund.
  async restoreStock(
    productId: string,
    size: ProductSize,
    quantity: number,
    context: StockMovementContext
  ): Promise<void> {
    const updated = await this.productModel.findOneAndUpdate(
      { _id: productId, 'sizes.size': size },
      { $inc: { 'sizes.$.stock': quantity } },
      { new: true }
    );
    if (updated) {
      await this.recordStockMovement(productId, size, quantity, updated, context);
    }
  }

  private async recordStockMovement(
    productId: string,
    size: ProductSize,
    quantityChange: number,
    updatedProduct: ProductDocument,
    context: StockMovementContext
  ): Promise<void> {
    const resultingStock = updatedProduct.sizes.find(s => s.size === size)?.stock ?? 0;
    await this.stockMovementModel.create({
      product: productId,
      size,
      quantityChange,
      resultingStock,
      reason: context.reason,
      reference: context.reference ?? null,
    });

    // A 0 -> positive transition on this exact size is what "back in stock"
    // means — fires for any positive movement (order rollback, admin
    // recount) regardless of what caused it, not just deliberate restocks.
    const previousStock = resultingStock - quantityChange;
    if (quantityChange > 0 && previousStock === 0 && resultingStock > 0) {
      this.eventEmitter.emit('product.back_in_stock', {
        productId: updatedProduct._id,
        productName: updatedProduct.name,
        productSlug: updatedProduct.slug,
        size,
      });
    }
  }

  // Decrements every line for an order one at a time. If any line can't be
  // satisfied, every line already decremented in this same call is put back
  // before returning failure — the order either reserves all of its stock
  // or none of it, never a partial reservation. `reference` (e.g. an order
  // number or idempotency key) ties every resulting ledger entry back to
  // the order that caused it.
  async reserveStockForOrder(
    lines: StockLine[],
    reference: string
  ): Promise<{ success: true } | { success: false; failedLine: StockLine }> {
    const decremented: StockLine[] = [];

    for (const line of lines) {
      const ok = await this.decrementStock(line.productId, line.size, line.quantity, {
        reason: 'order_placed',
        reference,
      });
      if (!ok) {
        for (const done of decremented) {
          await this.restoreStock(done.productId, done.size, done.quantity, {
            reason: 'order_rollback',
            reference,
          });
        }
        return { success: false, failedLine: line };
      }
      decremented.push(line);
    }

    return { success: true };
  }

  // Manual admin correction (recount, damaged stock, etc.) — unlike
  // reserveStockForOrder, each line is independent: one bad line doesn't
  // roll back the others, since these aren't one purchase that must succeed
  // or fail atomically together. `adminReference` (the admin's id/email)
  // becomes the ledger's `reference`, same field an order number occupies
  // for order-driven movements — so "who/what caused this" is always
  // answerable the same way regardless of cause.
  async bulkAdjustStock(
    lines: { productId: string; size: ProductSize; quantityChange: number }[],
    adminReference: string
  ): Promise<
    {
      productId: string;
      size: ProductSize;
      quantityChange: number;
      success: boolean;
      error?: string;
    }[]
  > {
    const results: {
      productId: string;
      size: ProductSize;
      quantityChange: number;
      success: boolean;
      error?: string;
    }[] = [];

    for (const line of lines) {
      if (line.quantityChange === 0) {
        results.push({ ...line, success: false, error: 'quantityChange cannot be 0' });
        continue;
      }

      if (line.quantityChange > 0) {
        await this.restoreStock(line.productId, line.size, line.quantityChange, {
          reason: 'admin_adjustment',
          reference: adminReference,
        });
        results.push({ ...line, success: true });
      } else {
        const ok = await this.decrementStock(line.productId, line.size, -line.quantityChange, {
          reason: 'admin_adjustment',
          reference: adminReference,
        });
        results.push({
          ...line,
          success: ok,
          ...(ok ? {} : { error: 'Not enough stock to decrement by that amount' }),
        });
      }
    }

    return results;
  }

  async getStockMovements(productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }

    const movements = await this.stockMovementModel
      .find({ product: productId })
      .sort({ createdAt: -1 })
      .limit(200);

    return {
      success: true,
      message: 'Stock movements retrieved successfully',
      data: movements,
    };
  }
}
