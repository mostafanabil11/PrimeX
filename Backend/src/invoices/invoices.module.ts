import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { InvoicesService } from './invoices.service';
import { InvoicesController } from './invoices.controller';
import { Invoice, InvoiceSchema } from './schemas/invoice.schema';
import { Counter, CounterSchema } from '@/orders/schemas/counter.schema';
import { Subscription, SubscriptionSchema } from '@/subscriptions/schemas/subscription.schema';

@Module({
  // Counter is the storefront's generic atomic-sequence collection. Importing
  // the schema is not a dependency on the orders module — it is a shared
  // primitive, and invoice numbers need the same guarantee order numbers do.
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
