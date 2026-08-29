import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { BookingsService } from './bookings.service';
import { BookingsController } from './bookings.controller';
import { BookingsListener } from './listeners/bookings.listener';
import { BookingsScheduler } from './bookings.scheduler';
import { Booking, BookingSchema } from './schemas/booking.schema';
import { ClassSession, ClassSessionSchema } from '@/classes/schemas/class-session.schema';
import { Subscription, SubscriptionSchema } from '@/subscriptions/schemas/subscription.schema';
import { User, UserSchema } from '@/auth/schemas/user.schema';
import { SubscriptionsModule } from '@/subscriptions/subscriptions.module';
import { SettingsModule } from '@/settings/settings.module';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Booking.name, schema: BookingSchema },
      // Registered here rather than imported from ClassesModule: bookings owns
      // the capacity counter on a session, and ClassesModule depends on this
      // one for releasing bookings, so importing it would be a cycle.
      { name: ClassSession.name, schema: ClassSessionSchema },
      // Read-only, for the booking emails: the recipient's name and address,
      // and the credit balance shown on a confirmation. Same reason as the
      // session model above — importing the owning modules would cycle.
      { name: User.name, schema: UserSchema },
      { name: Subscription.name, schema: SubscriptionSchema },
    ]),
    SubscriptionsModule,
    SettingsModule,
    // For EmailService, which AuthModule exports.
    AuthModule,
    ConfigModule,
  ],
  controllers: [BookingsController],
  providers: [BookingsService, BookingsListener, BookingsScheduler],
  exports: [BookingsService],
})
export class BookingsModule {}
