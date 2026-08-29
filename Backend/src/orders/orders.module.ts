import { Module, forwardRef } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PaymentModule } from '@/payment/payment.module';
import { ConfigModule } from '@/config/config.module';
import { OrdersService } from './orders.service';
import { OrdersController } from './orders.controller';
import { OrdersListener } from './listeners/orders.listener';
import { OrdersScheduler } from './orders.scheduler';
import { Order, OrderSchema } from './schemas/order.schema';
import { Counter, CounterSchema } from './schemas/counter.schema';
import { User, UserSchema } from '@/auth/schemas/user.schema';
import { AuthModule } from '@/auth/auth.module';
import { CartModule } from '@/cart/cart.module';
import { AddressesModule } from '@/addresses/addresses.module';
import { ProductsModule } from '@/products/products.module';
import { SettingsModule } from '@/settings/settings.module';
import { CouponsModule } from '@/coupons/coupons.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Order.name, schema: OrderSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: User.name, schema: UserSchema },
    ]),
    AuthModule,
    CartModule,
    AddressesModule,
    ProductsModule,
    SettingsModule,
    CouponsModule,
    ConfigModule,
    forwardRef(() => PaymentModule),
  ],
  controllers: [OrdersController],
  providers: [OrdersService, OrdersListener, OrdersScheduler],
  exports: [OrdersService],
})
export class OrdersModule {}
