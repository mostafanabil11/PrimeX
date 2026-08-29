import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';

export const PRODUCT_SIZES = ['S', 'M', 'L', 'XL', '2XL'] as const;
export type ProductSize = (typeof PRODUCT_SIZES)[number];

@Schema({ _id: false })
export class ProductSizeStock {
  @Prop({ required: true, enum: PRODUCT_SIZES })
  size!: ProductSize;

  @Prop({ required: true, min: 0, default: 0 })
  stock: number = 0;
}

export const ProductSizeStockSchema = SchemaFactory.createForClass(ProductSizeStock);
