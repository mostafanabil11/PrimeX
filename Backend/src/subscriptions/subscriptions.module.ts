import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SubscriptionsService } from './subscriptions.service';
import { SubscriptionsController } from './subscriptions.controller';
import { SubscriptionsScheduler } from './subscriptions.scheduler';
import { Subscription, SubscriptionSchema } from './schemas/subscription.schema';
import { SettingsModule } from '@/settings/settings.module';
import { InvoicesModule } from '@/invoices/invoices.module';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Subscription.name, schema: SubscriptionSchema }]),
    SettingsModule,
    // The scheduler needs invoices (to close abandoned ones) and email plus
    // config (to send expiry reminders).
    InvoicesModule,
    AuthModule,
    ConfigModule,
  ],
  controllers: [SubscriptionsController],
  providers: [SubscriptionsService, SubscriptionsScheduler],
  exports: [SubscriptionsService, MongooseModule],
})
export class SubscriptionsModule {}
