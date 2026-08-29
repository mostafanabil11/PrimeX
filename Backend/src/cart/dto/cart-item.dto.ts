import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PRODUCT_SIZES } from '@/products/schemas/product-size-stock.schema';

export const cartItemSchema = z.object({
  productId: z.string().min(1, 'Product id is required'),
  size: z.enum(PRODUCT_SIZES),
  quantity: z.number().int().positive('Quantity must be at least 1'),
});

export class CartItemDto extends createZodDto(cartItemSchema) {}

export const updateCartItemSchema = z.object({
  quantity: z.number().int().min(0, 'Quantity cannot be negative'),
});

export class UpdateCartItemDto extends createZodDto(updateCartItemSchema) {}
