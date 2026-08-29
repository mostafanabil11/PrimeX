import {
  Injectable,
  BadRequestException,
  ForbiddenException,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Review, ReviewDocument, ReviewStatus } from './schemas/review.schema';
import { Booking, BookingDocument } from '@/bookings/schemas/booking.schema';
import { ClassSession, ClassSessionDocument } from '@/classes/schemas/class-session.schema';
import { ClassType, ClassTypeDocument } from '@/class-types/schemas/class-type.schema';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(
    @InjectModel(Review.name) private reviewModel: Model<ReviewDocument>,
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(ClassSession.name) private sessionModel: Model<ClassSessionDocument>,
    @InjectModel(ClassType.name) private classTypeModel: Model<ClassTypeDocument>
  ) {}

  // "Actually took the class" means an attended booking on some session of
  // this class type — a session is one dated occurrence, so this has to hop
  // through the sessions that belong to the type rather than a direct field
  // on Booking.
  private async findVerifyingBooking(
    userId: string,
    classTypeId: string
  ): Promise<BookingDocument> {
    const sessionIds = await this.sessionModel.find({ classType: classTypeId }).distinct('_id');

    const booking = await this.bookingModel.findOne({
      member: userId,
      status: 'attended',
      session: { $in: sessionIds },
    });
    if (!booking) {
      throw new ForbiddenException('You can only review a class you have attended');
    }
    return booking;
  }

  async create(userId: string, dto: CreateReviewDto) {
    if (!Types.ObjectId.isValid(dto.classTypeId)) {
      throw new BadRequestException('Invalid class id');
    }

    const booking = await this.findVerifyingBooking(userId, dto.classTypeId);

    try {
      const review = await this.reviewModel.create({
        classType: dto.classTypeId,
        user: userId,
        booking: booking._id,
        rating: dto.rating,
        title: dto.title,
        body: dto.body,
        status: 'pending',
      });
      return {
        success: true,
        message: 'Review submitted — it will appear once approved',
        data: review,
      };
    } catch (err: any) {
      if (err?.code === 11000) {
        throw new ConflictException("You've already reviewed this class");
      }
      throw err;
    }
  }

  async listApprovedForClassType(classTypeId: string) {
    if (!Types.ObjectId.isValid(classTypeId)) {
      throw new BadRequestException('Invalid class id');
    }
    const reviews = await this.reviewModel
      .find({ classType: classTypeId, status: 'approved' })
      .populate('user', 'firstName lastName')
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: 'Reviews retrieved',
      data: reviews,
    };
  }

  // Recomputes straight off the approved-review set rather than incrementing
  // a running average — a review can move pending->approved->rejected in
  // either direction, and a recount is the only version of this that can't
  // drift out of sync with reality.
  private async recomputeAggregate(classTypeId: Types.ObjectId): Promise<void> {
    const [agg] = await this.reviewModel.aggregate([
      { $match: { classType: classTypeId, status: 'approved' } },
      { $group: { _id: null, avg: { $avg: '$rating' }, count: { $sum: 1 } } },
    ]);

    await this.classTypeModel.updateOne(
      { _id: classTypeId },
      {
        $set: {
          averageRating: agg ? Math.round(agg.avg * 10) / 10 : 0,
          reviewCount: agg ? agg.count : 0,
        },
      }
    );
  }

  // --- Admin moderation ---

  async listForModeration(status?: ReviewStatus) {
    const filter = status ? { status } : {};
    const reviews = await this.reviewModel
      .find(filter)
      .populate('user', 'firstName lastName email')
      .populate('classType', 'name slug')
      .sort({ createdAt: -1 });

    return {
      success: true,
      message: 'Reviews retrieved',
      data: reviews,
    };
  }

  async moderate(id: string, status: 'approved' | 'rejected') {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid review id');
    }
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    review.status = status;
    await review.save();
    await this.recomputeAggregate(review.classType as Types.ObjectId);

    return {
      success: true,
      message: `Review ${status}`,
      data: review,
    };
  }

  async remove(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid review id');
    }
    const review = await this.reviewModel.findById(id);
    if (!review) {
      throw new NotFoundException('Review not found');
    }

    const classTypeId = review.classType as Types.ObjectId;
    await review.deleteOne();
    await this.recomputeAggregate(classTypeId);

    return {
      success: true,
      message: 'Review deleted',
      data: null,
    };
  }
}
