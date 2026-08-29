import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AdminService } from './admin.service';
import { AdminController } from './admin.controller';
import { AuditListener } from './listeners/audit.listener';
import { AuditLog, AuditLogSchema } from './schemas/audit-log.schema';
import { Order, OrderSchema } from '@/orders/schemas/order.schema';
import { Product, ProductSchema } from '@/products/schemas/product.schema';
import { User, UserSchema } from '@/auth/schemas/user.schema';
import { Subscription, SubscriptionSchema } from '@/subscriptions/schemas/subscription.schema';
import { Invoice, InvoiceSchema } from '@/invoices/schemas/invoice.schema';
import { Booking, BookingSchema } from '@/bookings/schemas/booking.schema';
import { ClassSession, ClassSessionSchema } from '@/classes/schemas/class-session.schema';
import { Enquiry, EnquirySchema } from '@/enquiries/schemas/enquiry.schema';
import { CtaClick, CtaClickSchema } from '@/funnel/schemas/cta-click.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: AuditLog.name, schema: AuditLogSchema },
      // Read-only here: dashboard aggregation and the audit listener need
      // direct model access across domains that don't otherwise depend on
      // each other. No writes happen to Order/Product/User through this
      // module — those stay owned by OrdersService/ProductsService/AuthService.
      { name: Order.name, schema: OrderSchema },
      { name: Product.name, schema: ProductSchema },
      { name: User.name, schema: UserSchema },
      // The gym half of the same read-only pattern: the dashboard needs
      // cross-domain aggregation, and nothing here is ever written.
      { name: Subscription.name, schema: SubscriptionSchema },
      { name: Invoice.name, schema: InvoiceSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: ClassSession.name, schema: ClassSessionSchema },
      { name: Enquiry.name, schema: EnquirySchema },
      // Same read-only pattern again, rather than importing FunnelModule:
      // the funnel report is aggregation-for-a-screen, and this keeps that
      // module free of any dependency on the admin side.
      { name: CtaClick.name, schema: CtaClickSchema },
    ]),
  ],
  controllers: [AdminController],
  providers: [AdminService, AuditListener],
})
export class AdminModule {}
