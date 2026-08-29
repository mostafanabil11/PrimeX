import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Plan, PlanDocument } from './schemas/plan.schema';
import { CreatePlanDto, UpdatePlanDto } from './dto';
import { slugify } from '@/common/utils/slugify.util';
import { ensureUniqueSlug, definedFieldsOnly } from '@/common/utils/unique-slug.util';
import { OffersService } from '@/offers/offers.service';
import { resolveOfferPricing, OfferPricing } from '@/offers/offer-pricing';

// A plan as the public API returns it: the stored document plus the price it
// actually sells at today. Written out rather than inferred because spreading
// a lean() result produces a type too large for TypeScript to serialize.
export type PlanWithPricing = Plan & { _id: Types.ObjectId; pricing: OfferPricing };

export interface PlanListResponse {
  success: true;
  message: string;
  data: PlanWithPricing[];
}

export interface PlanResponse {
  success: true;
  message: string;
  data: PlanWithPricing;
}

/**
 * Fills in fields added after a plan was written.
 *
 * lean() returns raw Mongo documents and never applies schema defaults, so a
 * plan stored before `perks` existed comes back with it undefined — and the
 * pricing page maps over that array, which takes the whole page down rather
 * than degrading. Backfilling the collection fixes today's documents; doing it
 * here fixes the next field too.
 */
function withDefaults<T extends Partial<Plan>>(plan: T) {
  return {
    ...plan,
    perks: plan.perks ?? [],
    accessScope: plan.accessScope ?? ('gym_or_fitness' as const),
    sessionsIncluded: plan.sessionsIncluded ?? null,
    daysPerWeek: plan.daysPerWeek ?? null,
    benefits: plan.benefits ?? [],
  };
}

@Injectable()
export class PlansService {
  constructor(
    @InjectModel(Plan.name) private planModel: Model<PlanDocument>,
    private offersService: OffersService
  ) {}

  private toObjectId(id: string): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException('Invalid plan id');
    }
    return new Types.ObjectId(id);
  }

  async create(dto: CreatePlanDto) {
    const baseSlug = dto.slug || slugify(dto.name);
    if (!baseSlug) {
      throw new BadRequestException('Plan name must contain at least one letter or number');
    }

    const plan = await this.planModel.create({
      ...dto,
      slug: await ensureUniqueSlug(this.planModel, baseSlug),
    });

    return {
      success: true,
      message: 'Plan created successfully',
      data: plan,
    };
  }

  /**
   * The public pricing grid, with live offers already applied.
   *
   * Prices are resolved here rather than in the browser so there is exactly
   * one implementation of the discount rules, shared with the join funnel.
   * A client that computed its own would eventually disagree with the invoice.
   */
  async findAll(): Promise<PlanListResponse> {
    const [plans, offers] = await Promise.all([
      this.planModel.find({ isActive: true }).sort({ sortOrder: 1, priceMinorUnits: 1 }).lean(),
      this.offersService.findLive(),
    ]);

    const now = new Date();

    return {
      success: true,
      message: 'Plans retrieved successfully',
      data: plans.map(plan => ({
        ...withDefaults(plan),
        pricing: resolveOfferPricing(plan, offers, now),
      })),
    };
  }

  async findAllAdmin() {
    const plans = await this.planModel.find().sort({ sortOrder: 1, priceMinorUnits: 1 }).lean();

    return {
      success: true,
      message: 'Plans retrieved successfully',
      data: plans,
    };
  }

  async findBySlug(slug: string): Promise<PlanResponse> {
    const plan = await this.planModel.findOne({ slug, isActive: true }).lean();
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    // Priced the same way as the listing — a plan quoted at one price on the
    // grid and another on its own page would be worse than no page at all.
    const offers = await this.offersService.findLive();

    return {
      success: true,
      message: 'Plan retrieved successfully',
      data: { ...withDefaults(plan), pricing: resolveOfferPricing(plan, offers) },
    };
  }

  async findOneAdmin(id: string) {
    const plan = await this.planModel.findById(this.toObjectId(id)).lean();
    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      success: true,
      message: 'Plan retrieved successfully',
      data: plan,
    };
  }

  async update(id: string, dto: UpdatePlanDto) {
    const objectId = this.toObjectId(id);
    const existing = await this.planModel.findById(objectId);
    if (!existing) {
      throw new NotFoundException('Plan not found');
    }

    const update: Record<string, unknown> = definedFieldsOnly(dto);

    // The discount rule needs both numbers, and a patch may carry either one,
    // both, or neither — so it is re-checked here against whatever the plan
    // will actually hold once this update lands. The create DTO cannot do it
    // for the same reason: it never sees the stored document.
    const nextPrice = dto.priceMinorUnits ?? existing.priceMinorUnits;
    const nextDiscount =
      dto.discountPriceMinorUnits === undefined
        ? existing.discountPriceMinorUnits
        : dto.discountPriceMinorUnits;

    if (nextDiscount !== null && nextDiscount !== undefined && nextDiscount >= nextPrice) {
      throw new BadRequestException('The discounted price must be lower than the regular price');
    }

    const plan = await this.planModel.findByIdAndUpdate(objectId, { $set: update }, { new: true });

    return {
      success: true,
      message: 'Plan updated successfully',
      data: plan,
    };
  }

  // Deactivates rather than deletes. Every subscription snapshots its plan at
  // the point of purchase, but the reference is still followed for "renew the
  // same plan" and for reporting, and a dangling id there would be worse than
  // a hidden document.
  async deactivate(id: string) {
    const plan = await this.planModel.findByIdAndUpdate(
      this.toObjectId(id),
      { $set: { isActive: false } },
      { new: true }
    );

    if (!plan) {
      throw new NotFoundException('Plan not found');
    }

    return {
      success: true,
      message: 'Plan deactivated successfully',
      data: plan,
    };
  }

  // Used by the join funnel: returns the document itself rather than an
  // envelope, because the caller needs to snapshot its fields onto a
  // subscription rather than send it to a browser.
  async getActivePlanOrFail(id: string): Promise<PlanDocument> {
    const plan = await this.planModel.findOne({ _id: this.toObjectId(id), isActive: true });
    if (!plan) {
      throw new NotFoundException('Plan not found or no longer available');
    }
    return plan;
  }
}
