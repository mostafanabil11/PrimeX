import { z } from 'zod';
import { createZodDto } from 'nestjs-zod';
import { PRODUCT_SIZES } from '../schemas/product-size-stock.schema';

const sizeEnum = z.enum(PRODUCT_SIZES);

export const createProductSchema = z.object({
  name: z.string().min(1, 'Name is required').max(150),
  description: z.string().max(2000).optional().nullable(),
  color: z.string().min(1, 'Color is required').max(50),
  styleGroup: z.string().max(150).optional().nullable(),
  category: z.string().min(1, 'Category is required'),
  // Minor units (piastres — 1 EGP = 100), always an integer, so money never
  // touches floating-point arithmetic on the way in.
  price: z
    .number()
    .int('Price must be a whole number of minor units (e.g. piastres)')
    .positive('Price must be greater than 0'),
  discountPrice: z
    .number()
    .int('Discount price must be a whole number of minor units')
    .positive()
    .optional()
    .nullable(),
  images: z.array(z.string()).min(1, 'At least one image is required'),
  sizes: z
    .array(
      z.object({
        size: sizeEnum,
        stock: z.number().int().min(0),
      })
    )
    .min(1, 'At least one size is required'),
  isBestSeller: z.boolean().optional(),
});

export class CreateProductDto extends createZodDto(createProductSchema) {}
