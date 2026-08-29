import { Module, forwardRef } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ConfigModule } from '@/config/config.module';
import { OrdersModule } from '@/orders/orders.module';
import { InvoicesModule } from '@/invoices/invoices.module';

@Module({
  imports: [
    ConfigModule,
    // OrdersModule also depends on this module (checkout needs to create a
    // payment session), so the pair is resolved lazily on both sides.
    forwardRef(() => OrdersModule),
    // The gym half. No forwardRef needed: invoices does not depend on
    // payments, the join flow calls PaymentService through its own module.
    InvoicesModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
