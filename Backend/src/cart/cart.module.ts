import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CartService } from './cart.service';
import { CartController } from './cart.controller';
import { CartScheduler } from './cart.scheduler';
import { Cart, CartSchema } from './schemas/cart.schema';
import { Product, ProductSchema } from '@/products/schemas/product.schema';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Cart.name, schema: CartSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    AuthModule,
    ConfigModule,
  ],
  controllers: [CartController],
  providers: [CartService, CartScheduler],
  exports: [CartService],
})
export class CartModule {}
