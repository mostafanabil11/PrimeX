import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { OffersService } from './offers.service';
import { OffersController } from './offers.controller';
import { Offer, OfferSchema } from './schemas/offer.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: Offer.name, schema: OfferSchema }])],
  controllers: [OffersController],
  providers: [OffersService],
  // PlansService prices the public listing through this, and JoinService
  // prices the actual charge through it.
  exports: [OffersService],
})
export class OffersModule {}
