import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { Counter, CounterSchema } from '@/common/schemas/counter.schema';
import { Subscription, SubscriptionSchema } from '@/subscriptions/schemas/subscription.schema';

@Module({
  // Counter is a shared, generic atomic-sequence collection (see
  // common/schemas/counter.schema.ts) — invoice numbers need the same
  // gapless-sequence guarantee member numbers do, and this is that guarantee.
  //
  // Subscription is registered the same way, and for the same reason: the
  // admin invoice list resolves a reference code to a subscription id, and
  // importing SubscriptionsModule would be circular — it already imports this.
  imports: [
    MongooseModule.forFeature([
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Counter.name, schema: CounterSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
  ],
  controllers: [InvoicesController],
  providers: [InvoicesService],
  exports: [InvoicesService, MongooseModule],
})
export class InvoicesModule {}
