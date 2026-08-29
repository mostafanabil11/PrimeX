import { Module, MiddlewareConsumer, NestModule } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { AuthGuard } from './auth/guards/auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { FeatureGuard } from './common/guards/feature.guard';
import { ConfigService } from './config/config.service';
import { validateEnv } from './config/env.validation';
import { LoggerMiddleware } from './common/middleware/logger.middleware';
import { ConfigModule as MyConfigModule } from './config/config.module';
import { BranchesModule } from './branches/branches.module';
import { PlansModule } from './plans/plans.module';
import { OffersModule } from './offers/offers.module';
import { TrainersModule } from './trainers/trainers.module';
import { ClassTypesModule } from './class-types/class-types.module';
import { ContentModule } from './content/content.module';
import { EnquiriesModule } from './enquiries/enquiries.module';
import { FunnelModule } from './funnel/funnel.module';
import { SubscriptionsModule } from './subscriptions/subscriptions.module';
import { InvoicesModule } from './invoices/invoices.module';
import { JoinModule } from './join/join.module';
import { ClassesModule } from './classes/classes.module';
import { BookingsModule } from './bookings/bookings.module';
import { CategoriesModule } from './categories/categories.module';
import { ProductsModule } from './products/products.module';
import { SettingsModule } from './settings/settings.module';
import { AddressesModule } from './addresses/addresses.module';
import { CartModule } from './cart/cart.module';
import { OrdersModule } from './orders/orders.module';
import { PaymentModule } from './payment/payment.module';
import { CouponsModule } from './coupons/coupons.module';
import { AdminModule } from './admin/admin.module';
import { CommonModule } from './common/common.module';
import { ReviewsModule } from './reviews/reviews.module';
import { WishlistModule } from './wishlist/wishlist.module';
import { NewsletterModule } from './newsletter/newsletter.module';
import { BackInStockModule } from './back-in-stock/back-in-stock.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validate: validateEnv,
    }),
    EventEmitterModule.forRoot(),
    ScheduleModule.forRoot(),
    // Baseline for every route that doesn't opt into a stricter or looser
    // tier via @Throttle — see auth.controller.ts (5/min on login, register,
    // OTP, password reset) and products/categories controllers' public GET
    // handlers (120/min for normal catalog browsing).
    ThrottlerModule.forRoot([
      {
        name: 'default',
        ttl: 60000,
        limit: 60,
      },
    ]),
    MongooseModule.forRootAsync({
      imports: [MyConfigModule],
      inject: [ConfigService],
      useFactory: async (configService: ConfigService) => ({
        uri: configService.mongodbUri,
      }),
    }),
    MyConfigModule,
    CommonModule,
    AuthModule,
    BranchesModule,
    PlansModule,
    OffersModule,
    TrainersModule,
    ClassTypesModule,
    ContentModule,
    EnquiriesModule,
    FunnelModule,
    SubscriptionsModule,
    InvoicesModule,
    JoinModule,
    ClassesModule,
    BookingsModule,
    CategoriesModule,
    ProductsModule,
    SettingsModule,
    AddressesModule,
    CartModule,
    CouponsModule,
    OrdersModule,
    PaymentModule,
    AdminModule,
    ReviewsModule,
    WishlistModule,
    NewsletterModule,
    BackInStockModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    // First, so a route switched off by @Feature 404s before it burns
    // throttle budget or reaches auth — see feature.guard.ts.
    {
      provide: APP_GUARD,
      useClass: FeatureGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
    {
      provide: APP_GUARD,
      useClass: AuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(LoggerMiddleware).forRoutes('*');
  }
}
