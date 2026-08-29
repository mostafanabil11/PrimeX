import { Injectable, BadRequestException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Wishlist, WishlistDocument } from './schemas/wishlist.schema';

@Injectable()
export class WishlistService {
  constructor(@InjectModel(Wishlist.name) private wishlistModel: Model<WishlistDocument>) {}

  private async getOrCreate(userId: string): Promise<WishlistDocument> {
    let wishlist = await this.wishlistModel.findOne({ user: userId });
    if (!wishlist) {
      wishlist = await this.wishlistModel.create({ user: userId, items: [] });
    }
    return wishlist;
  }

  async get(userId: string) {
    const wishlist = await this.getOrCreate(userId);
    // Populated (not just ids) so the frontend can render cards without a
    // second round trip — a deactivated/deleted product silently drops out
    // via populate rather than rendering a broken card.
    await wishlist.populate({
      path: 'items.product',
      select: 'name slug color images price discountPrice isActive sizes',
      match: { isActive: true },
    });
    const items = wishlist.items.filter(i => i.product);

    return {
      success: true,
      message: 'Wishlist retrieved',
      data: items,
    };
  }

  async add(userId: string, productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new BadRequestException('Invalid product id');
    }
    const wishlist = await this.getOrCreate(userId);
    const alreadyIn = wishlist.items.some(i => i.product.toString() === productId);
    if (!alreadyIn) {
      wishlist.items.push({ product: new Types.ObjectId(productId), addedAt: new Date() });
      await wishlist.save();
    }
    return this.get(userId);
  }

  async remove(userId: string, productId: string) {
    const wishlist = await this.getOrCreate(userId);
    wishlist.items = wishlist.items.filter(i => i.product.toString() !== productId);
    await wishlist.save();
    return this.get(userId);
  }
}
