import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Cart, CartDocument } from './schemas/cart.schema';
import { Product, ProductDocument } from '@/products/schemas/product.schema';
import { ProductSize } from '@/products/schemas/product-size-stock.schema';

interface RawCartLine {
  productId: string;
  size: ProductSize;
  quantity: number;
}

export interface ResolvedCartLine {
  productId: string;
  size: ProductSize;
  available: boolean;
  reason: 'ok' | 'invalid_product' | 'not_found' | 'inactive' | 'out_of_stock';
  requestedQuantity: number;
  quantity: number;
  availableStock: number;
  unitPrice: number | null;
  lineTotal: number;
  name: string | null;
  slug: string | null;
  color: string | null;
  image: string | null;
  categoryId: string | null;
  // True when this line's unitPrice came from discountPrice — coupons with
  // excludeSaleItems use this rather than re-deriving it from raw prices.
  onSale: boolean;
}

export interface ResolvedCart {
  items: ResolvedCartLine[];
  subtotal: number;
  // True if anything about the client's view of the cart no longer matches
  // reality — a price changed, stock ran out, quantity got clamped, a
  // product was deactivated. The frontend uses this to show a "your cart
  // changed" banner rather than silently charging a different total.
  hasChanges: boolean;
}

@Injectable()
export class CartService {
  constructor(
    @InjectModel(Cart.name) private cartModel: Model<CartDocument>,
    @InjectModel(Product.name) private productModel: Model<ProductDocument>
  ) {}

  // The single source of truth for "what does this cart actually cost right
  // now" — used by the authenticated cart endpoints below and by the public
  // /cart/validate endpoint for guests. Never trusts a price the caller sent;
  // always re-reads price/stock from Product.
  async resolveItems(rawItems: RawCartLine[]): Promise<ResolvedCart> {
    const results: ResolvedCartLine[] = [];
    let subtotal = 0;
    let hasChanges = false;

    for (const item of rawItems) {
      const empty = {
        productId: item.productId,
        size: item.size,
        requestedQuantity: item.quantity,
        quantity: 0,
        availableStock: 0,
        unitPrice: null,
        lineTotal: 0,
        name: null,
        slug: null,
        color: null,
        image: null,
        categoryId: null,
        onSale: false,
      };

      if (!Types.ObjectId.isValid(item.productId)) {
        results.push({ ...empty, available: false, reason: 'invalid_product' });
        hasChanges = true;
        continue;
      }

      const product = await this.productModel.findById(item.productId);
      if (!product) {
        results.push({ ...empty, available: false, reason: 'not_found' });
        hasChanges = true;
        continue;
      }
      if (!product.isActive) {
        results.push({
          ...empty,
          available: false,
          reason: 'inactive',
          name: product.name,
          slug: product.slug,
          color: product.color,
          image: product.images[0] ?? null,
          categoryId: product.category.toString(),
          onSale: product.discountPrice !== null,
        });
        hasChanges = true;
        continue;
      }

      const sizeStock = product.sizes.find(s => s.size === item.size);
      const availableStock = sizeStock?.stock ?? 0;
      const display = {
        name: product.name,
        slug: product.slug,
        color: product.color,
        image: product.images[0] ?? null,
        categoryId: product.category.toString(),
        onSale: product.discountPrice !== null,
      };

      if (availableStock <= 0) {
        results.push({ ...empty, ...display, available: false, reason: 'out_of_stock' });
        hasChanges = true;
        continue;
      }

      const quantity = Math.min(item.quantity, availableStock);
      if (quantity !== item.quantity) {
        hasChanges = true;
      }

      const unitPrice = product.discountPrice ?? product.price;
      const lineTotal = unitPrice * quantity;
      subtotal += lineTotal;

      results.push({
        productId: product._id.toString(),
        size: item.size,
        available: true,
        reason: 'ok',
        requestedQuantity: item.quantity,
        quantity,
        availableStock,
        unitPrice,
        lineTotal,
        ...display,
      });
    }

    return { items: results, subtotal, hasChanges };
  }

  async validate(rawItems: RawCartLine[]) {
    const resolved = await this.resolveItems(rawItems);
    return {
      success: true,
      message: 'Cart validated',
      data: resolved,
    };
  }

  private async getOrCreateCart(userId: string): Promise<CartDocument> {
    let cart = await this.cartModel.findOne({ user: userId });
    if (!cart) {
      cart = await this.cartModel.create({ user: userId, items: [] });
    }
    return cart;
  }

  private toRawItems(cart: CartDocument): RawCartLine[] {
    return cart.items.map(i => ({
      productId: i.product.toString(),
      size: i.size,
      quantity: i.quantity,
    }));
  }

  async getCart(userId: string) {
    const cart = await this.getOrCreateCart(userId);
    const resolved = await this.resolveItems(this.toRawItems(cart));
    return {
      success: true,
      message: 'Cart retrieved successfully',
      data: resolved,
    };
  }

  async addItem(userId: string, productId: string, size: ProductSize, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const existing = cart.items.find(i => i.product.toString() === productId && i.size === size);

    if (existing) {
      existing.quantity += quantity;
    } else {
      cart.items.push({ product: new Types.ObjectId(productId), size, quantity });
    }

    // New activity on this cart — it's no longer the same abandoned cart a
    // past reminder was about, so that cart is eligible for a fresh one.
    cart.abandonedEmailSentAt = null;
    await cart.save();
    const resolved = await this.resolveItems(this.toRawItems(cart));
    return {
      success: true,
      message: 'Item added to cart',
      data: resolved,
    };
  }

  async updateItem(userId: string, productId: string, size: ProductSize, quantity: number) {
    const cart = await this.getOrCreateCart(userId);
    const index = cart.items.findIndex(i => i.product.toString() === productId && i.size === size);

    if (index !== -1) {
      if (quantity <= 0) {
        cart.items.splice(index, 1);
      } else {
        cart.items[index].quantity = quantity;
      }
      await cart.save();
    }

    const resolved = await this.resolveItems(this.toRawItems(cart));
    return {
      success: true,
      message: 'Cart updated',
      data: resolved,
    };
  }

  async removeItem(userId: string, productId: string, size: ProductSize) {
    return this.updateItem(userId, productId, size, 0);
  }

  async clear(userId: string) {
    await this.cartModel.updateOne({ user: userId }, { $set: { items: [] } }, { upsert: true });
    return {
      success: true,
      message: 'Cart cleared',
      data: null,
    };
  }

  // Called by the checkout flow once an order is successfully placed from
  // this cart's contents — internal, not exposed as its own HTTP route.
  async clearInternal(userId: string): Promise<void> {
    await this.cartModel.updateOne({ user: userId }, { $set: { items: [] } });
  }

  // Non-empty, untouched for `staleAfterMs`, and never reminded about since
  // its last change — exactly the carts CartScheduler's recovery sweep
  // should email. Populates the owner's email/name in the same query so the
  // scheduler doesn't need a second round trip per cart.
  async findAbandoned(staleAfterMs: number): Promise<CartDocument[]> {
    return this.cartModel
      .find({
        'items.0': { $exists: true },
        abandonedEmailSentAt: null,
        updatedAt: { $lt: new Date(Date.now() - staleAfterMs) },
      })
      .populate('user', 'email firstName');
  }

  async markAbandonedEmailSent(cartId: Types.ObjectId): Promise<void> {
    await this.cartModel.updateOne({ _id: cartId }, { $set: { abandonedEmailSentAt: new Date() } });
  }
}
