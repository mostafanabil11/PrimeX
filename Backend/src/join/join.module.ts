import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { JoinService } from './join.service';
import { JoinController } from './join.controller';
import { JoinListener } from './listeners/join.listener';
import { User, UserSchema } from '@/auth/schemas/user.schema';
import { AuthModule } from '@/auth/auth.module';
import { PlansModule } from '@/plans/plans.module';
import { BranchesModule } from '@/branches/branches.module';
import { SettingsModule } from '@/settings/settings.module';
import { SubscriptionsModule } from '@/subscriptions/subscriptions.module';
import { InvoicesModule } from '@/invoices/invoices.module';
import { OffersModule } from '@/offers/offers.module';
import { PaymentModule } from '@/payment/payment.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),
    AuthModule,
    PlansModule,
    BranchesModule,
    SettingsModule,
    SubscriptionsModule,
    InvoicesModule,
    OffersModule,
    PaymentModule,
    ConfigModule,
  ],
  controllers: [JoinController],
  providers: [JoinService, JoinListener],
})
export class JoinModule {}
