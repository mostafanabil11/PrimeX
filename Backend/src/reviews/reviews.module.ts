import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReviewsService } from './reviews.service';
import { ReviewsController } from './reviews.controller';
import { Review, ReviewSchema } from './schemas/review.schema';
import { Booking, BookingSchema } from '@/bookings/schemas/booking.schema';
import { ClassSession, ClassSessionSchema } from '@/classes/schemas/class-session.schema';
import { ClassType, ClassTypeSchema } from '@/class-types/schemas/class-type.schema';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Review.name, schema: ReviewSchema },
      { name: Booking.name, schema: BookingSchema },
      { name: ClassSession.name, schema: ClassSessionSchema },
      { name: ClassType.name, schema: ClassTypeSchema },
    ]),
  ],
  controllers: [ReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
