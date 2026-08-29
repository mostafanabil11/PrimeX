import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BackInStockService } from './back-in-stock.service';
import { BackInStockController } from './back-in-stock.controller';
import { BackInStockListener } from './listeners/back-in-stock.listener';
import {
  BackInStockRequest,
  BackInStockRequestSchema,
} from './schemas/back-in-stock-request.schema';
import { Product, ProductSchema } from '@/products/schemas/product.schema';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: BackInStockRequest.name, schema: BackInStockRequestSchema },
      { name: Product.name, schema: ProductSchema },
    ]),
    AuthModule,
    ConfigModule,
  ],
  controllers: [BackInStockController],
  providers: [BackInStockService, BackInStockListener],
})
export class BackInStockModule {}
