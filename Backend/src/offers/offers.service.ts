import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Offer, OfferDocument } from './schemas/offer.schema';
import { CreateOfferDto, UpdateOfferDto } from './dto';
import { definedFieldsOnly } from '@/common/utils/unique-slug.util';

@Injectable()
export class OffersService {
  constructor(@InjectModel(Offer.name) private offerModel: Model<OfferDocument>) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid offer id');
    }
    return new Types.ObjectId(id);
  }

  /**
   * Every offer that could reduce a price right now.
   *
   * The date window is filtered in Mongo rather than in the resolver so this
   * stays cheap enough to call on every pricing request. The resolver
   * re-checks it anyway — it is pure and must be correct on whatever it is
   * handed, including in tests that pass offers directly.
   */
  async findLive(now: Date = new Date()): Promise<Offer[]> {
    return this.offerModel
      .find({
        isActive: true,
        $and: [
          { $or: [{ startsAt: null }, { startsAt: { $lte: now } }] },
          { $or: [{ endsAt: null }, { endsAt: { $gte: now } }] },
        ],
      })
      .lean();
  }

  async findAllAdmin() {
    const offers = await this.offerModel.find().sort({ isActive: -1, createdAt: -1 }).lean();

    return { success: true, message: 'Offers retrieved successfully', data: offers };
  }

  async findOneAdmin(id: string) {
    const offer = await this.offerModel.findById(this.toObjectId(id)).lean();
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return { success: true, message: 'Offer retrieved successfully', data: offer };
  }

  // The DTO carries dates as ISO strings (see the note in dto/index.ts), so
  // they are turned into Dates here rather than relying on Mongoose casting —
  // the date-window comparisons in findLive are only correct against real
  // Date values.
  private withDates<T extends { startsAt?: string | null; endsAt?: string | null }>(dto: T) {
    return {
      ...dto,
      ...(dto.startsAt === undefined ? {} : { startsAt: dto.startsAt && new Date(dto.startsAt) }),
      ...(dto.endsAt === undefined ? {} : { endsAt: dto.endsAt && new Date(dto.endsAt) }),
    };
  }

  async create(dto: CreateOfferDto) {
    const offer = await this.offerModel.create(this.withDates(dto));

    return { success: true, message: 'Offer created successfully', data: offer };
  }

  async update(id: string, dto: UpdateOfferDto) {
    const objectId = this.toObjectId(id);
    const existing = await this.offerModel.findById(objectId);
    if (!existing) {
      throw new NotFoundException('Offer not found');
    }

    // Re-checked here against what the offer will actually hold once this
    // update lands, because a patch may carry either half of each pair. The
    // create DTO cannot do it: it never sees the stored document.
    const nextType = dto.type ?? existing.type;
    const nextValue = dto.value ?? existing.value;
    if (nextType === 'percentage' && nextValue > 100) {
      throw new BadRequestException('A percentage offer cannot be more than 100%');
    }

    const nextStartsAt =
      dto.startsAt === undefined ? existing.startsAt : dto.startsAt && new Date(dto.startsAt);
    const nextEndsAt =
      dto.endsAt === undefined ? existing.endsAt : dto.endsAt && new Date(dto.endsAt);
    if (nextStartsAt && nextEndsAt && nextStartsAt >= nextEndsAt) {
      throw new BadRequestException('The end date must be after the start date');
    }

    const offer = await this.offerModel.findByIdAndUpdate(
      objectId,
      { $set: definedFieldsOnly(this.withDates(dto)) },
      { new: true }
    );

    return { success: true, message: 'Offer updated successfully', data: offer };
  }

  /**
   * Hard-deletes, unlike a plan.
   *
   * An offer leaves nothing dangling behind it: no subscription references
   * one, and an invoice records the price that was charged rather than a
   * pointer to the reason. The isActive flag is for pausing a promotion the
   * gym intends to run again, so a delete really does mean "this was a
   * mistake, remove it".
   */
  async remove(id: string) {
    const offer = await this.offerModel.findByIdAndDelete(this.toObjectId(id));
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }

    return { success: true, message: 'Offer deleted successfully', data: offer };
  }
}
