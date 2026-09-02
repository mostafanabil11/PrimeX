import { Module } from '@nestjs/common';
import { PaymentService } from './payment.service';
import { PaymentController } from './payment.controller';
import { ConfigModule } from '@/config/config.module';
import { InvoicesModule } from '@/invoices/invoices.module';

@Module({
  imports: [
    ConfigModule,
    // No forwardRef needed: invoices does not depend on payments, the join
    // flow calls PaymentService through its own module.
    InvoicesModule,
  ],
  controllers: [PaymentController],
  providers: [PaymentService],
  exports: [PaymentService],
})
export class PaymentModule {}
