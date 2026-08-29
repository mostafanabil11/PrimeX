import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import {
  BackInStockRequest,
  BackInStockRequestDocument,
} from './schemas/back-in-stock-request.schema';
import { Product, ProductDocument } from '@/products/schemas/product.schema';
import { ProductSize } from '@/products/schemas/product-size-stock.schema';

@Injectable()
export class BackInStockService {
  constructor(
    @InjectModel(BackInStockRequest.name) private requestModel: Model<BackInStockRequestDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  async create(productId: string, size: ProductSize, email: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }
    const product = await this.productModel.findById(productId);
    if (!product) {
      throw new NotFoundException('Product not found');
    }

    // Upsert: resubmitting the same email/product/size is a harmless no-op,
    // not an error the client has to special-case.
    await this.requestModel.updateOne(
      { product: productId, size, email: email.toLowerCase().trim() },
      {
        $setOnInsert: {
          product: productId,
          size,
          email: email.toLowerCase().trim(),
          notified: false,
        },
      },
      { upsert: true }
    );

    return {
      success: true,
      message: "We'll email you when this is back in stock",
      data: null,
    };
  }

  // Every still-pending request for this exact product+size, marked
  // notified in the same call so a second restock doesn't re-email someone
  // whose request already got resolved.
  async claimPendingForRestock(
    productId: Types.ObjectId,
    size: ProductSize
  ): Promise<BackInStockRequestDocument[]> {
    const pending = await this.requestModel.find({ product: productId, size, notified: false });
    if (pending.length === 0) {
      return [];
    }
    await this.requestModel.updateMany(
      { _id: { $in: pending.map(r => r._id) } },
      { $set: { notified: true } }
    );
    return pending;
  }
}
