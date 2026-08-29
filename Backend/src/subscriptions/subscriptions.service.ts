import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import {
  Subscription,
  SubscriptionDocument,
  SubscriptionStatus,
  SubscriptionOrigin,
  canTransition,
  generateReferenceCode,
} from './schemas/subscription.schema';
import { PlanDocument } from '@/plans/schemas/plan.schema';
import { SettingsService } from '@/settings/settings.service';
import {
  calculateEndsAt,
  currentCycle,
  startOfDay,
  addDays,
  daysBetween,
  endOfDay,
} from './subscription.dates';

@Injectable()
export class SubscriptionsService {
  private readonly logger = new Logger(SubscriptionsService.name);

  constructor(
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private settingsService: SettingsService,
    private events: EventEmitter2
  ) {}

  private toObjectId(id: string, label = 'subscription'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label} id`);
    }
    return new Types.ObjectId(id);
  }

  // Every status change goes through here. Guarding the transition in one
  // place is what stops a cancelled membership being quietly reactivated by
  // some future code path that only meant to tidy up.
  private assertTransition(doc: SubscriptionDocument, to: SubscriptionStatus): void {
    if (doc.status === to) {
      throw new ConflictException(`This membership is already ${to}`);
    }
    if (!canTransition(doc.status, to)) {
      throw new ConflictException(`A ${doc.status} membership cannot become ${to}`);
    }
  }

  /**
   * Builds the pending subscription for a join, snapshotting the plan.
   *
   * Pending, not active: nothing has been paid yet. Activation happens when
   * the invoice is settled, which for a card is the webhook and for cash is a
   * staff member at the desk.
   */
  async createPending(input: {
    memberId: string;
    plan: PlanDocument;
    branchId: string;
    startsAt: Date;
    agreementVersion: string;
    renewedFrom?: string | null;
    origin?: SubscriptionOrigin | null;
    /**
     * Staff recording a membership that already started — importing someone
     * who has been training for weeks, or catching up after a busy Saturday.
     *
     * Never set from a public request. The guard is relaxed rather than
     * removed: a year back is the furthest anyone can plausibly be recording,
     * and it still catches a date typed wrong by a decade.
     */
    allowBackdating?: boolean;
  }): Promise<SubscriptionDocument> {
    const startsAt = startOfDay(input.startsAt);
    this.assertStartDateAllowed(startsAt, input.allowBackdating);

    const plan = input.plan;
    const settings = (await this.settingsService.getSettings()).data;

    // A plan may allow fewer freeze days than the gym-wide ceiling, never more.
    const freezeDaysAllowed = Math.min(plan.freezeDaysAllowed, settings.maxFreezeDaysPerCycle);

    return this.subscriptionModel.create({
      member: this.toObjectId(input.memberId, 'member'),
      branch: this.toObjectId(input.branchId, 'branch'),
      status: 'pending',
      startsAt,
      endsAt: calculateEndsAt(startsAt, plan.durationValue, plan.durationUnit),
      planSnapshot: {
        plan: plan._id,
        name: plan.name,
        slug: plan.slug,
        tier: plan.tier,
        durationValue: plan.durationValue,
        durationUnit: plan.durationUnit,
        priceMinorUnits: plan.discountPriceMinorUnits ?? plan.priceMinorUnits,
        classAccessMode: plan.classAccess.mode,
        creditsPerCycle: plan.classAccess.creditsPerCycle,
        branchAccess: plan.branchAccess,
        freezeDaysAllowed,
        guestPasses: plan.guestPasses,
      },
      guestPassesRemaining: plan.guestPasses,
      agreementVersion: input.agreementVersion,
      agreementAcceptedAt: new Date(),
      renewedFrom: input.renewedFrom ? this.toObjectId(input.renewedFrom) : null,
      origin: input.origin ?? null,
      backdated:
        Boolean(input.allowBackdating) && startsAt.getTime() < startOfDay(new Date()).getTime(),
      referenceCode: await this.nextReferenceCode(),
    });
  }

  /**
   * Whether a membership may start on this date.
   *
   * Public so callers can check *before* doing anything with side effects.
   * The reservation endpoint needs that: it creates a member account, and
   * discovering the date was invalid afterwards would leave an orphan account
   * behind on every mistyped form — on a public, unauthenticated route.
   *
   * createPending calls this too, so the rule lives in one place and the
   * early check cannot drift from the enforced one.
   */
  assertStartDateAllowed(startsAt: Date, allowBackdating?: boolean): void {
    const day = startOfDay(startsAt);

    if (allowBackdating) {
      if (daysBetween(day, new Date()) > 365) {
        throw new BadRequestException('A membership cannot be backdated more than a year');
      }
    } else if (day.getTime() < startOfDay(addDays(new Date(), -1)).getTime()) {
      throw new BadRequestException('A membership cannot start in the past');
    }

    // Ninety days is generous for "I want to start when I get back", and
    // still stops a start date being typed wrong by a year.
    if (daysBetween(new Date(), day) > 90) {
      throw new BadRequestException('A membership cannot be booked more than 90 days ahead');
    }
  }

  /**
   * A short code staff can match against a WhatsApp thread.
   *
   * Retried rather than assumed unique: six characters of a 32-symbol alphabet
   * is about a billion, so a collision is rare — but rare across a whole
   * member base is not never, and the unique index would reject it. Five
   * attempts is far beyond what the odds need; failing loudly after that beats
   * handing out a duplicate.
   */
  private async nextReferenceCode(): Promise<string> {
    for (let attempt = 0; attempt < 5; attempt++) {
      const candidate = generateReferenceCode();
      const existing = await this.subscriptionModel.exists({ referenceCode: candidate });
      if (!existing) return candidate;
    }
    throw new ConflictException('Could not allocate a reference code — please try again');
  }

  /**
   * Turns a paid membership on.
   *
   * Idempotent by design: a duplicate Paymob webhook, or a staff member
   * clicking "record payment" twice, must not extend anyone's term or hand out
   * a second set of credits. An already-active subscription returns unchanged.
   */
  async activate(subscriptionId: string | Types.ObjectId): Promise<SubscriptionDocument> {
    const id =
      typeof subscriptionId === 'string' ? this.toObjectId(subscriptionId) : subscriptionId;

    const subscription = await this.subscriptionModel.findById(id);
    if (!subscription) {
      throw new NotFoundException('Membership not found');
    }

    if (subscription.status === 'active') {
      return subscription;
    }

    this.assertTransition(subscription, 'active');

    // Recompute the term from today if the start date has already slipped
    // past — someone who joined intending to start on Monday and paid on
    // Wednesday should get their full term, not a short one.
    //
    // Except when staff deliberately backdated it. Recording a member who has
    // been training since last month means their term genuinely started then,
    // and pulling it forward would silently hand them extra weeks they did not
    // buy. The flag lives on the document rather than being a parameter here
    // because activation arrives through the invoice.paid event, which no
    // argument can cross.
    const now = new Date();
    if (!subscription.backdated && subscription.startsAt.getTime() < startOfDay(now).getTime()) {
      subscription.startsAt = startOfDay(now);
      subscription.endsAt = calculateEndsAt(
        subscription.startsAt,
        subscription.planSnapshot.durationValue,
        subscription.planSnapshot.durationUnit
      );
    }

    subscription.status = 'active';
    subscription.classCredits = this.seedCredits(subscription, now);

    await subscription.save();

    this.events.emit('subscription.activated', {
      subscriptionId: (subscription._id as Types.ObjectId).toString(),
      memberId: subscription.member.toString(),
    });

    return subscription;
  }

  // Sets the first credit cycle. Unlimited and none-access plans carry zero
  // remaining, and booking reads the mode rather than the number — so a
  // zero here never means "unlimited plan with nothing left".
  private seedCredits(subscription: SubscriptionDocument, now: Date) {
    const cycle = currentCycle(subscription.startsAt, subscription.endsAt, now);

    return {
      remaining:
        subscription.planSnapshot.classAccessMode === 'credits'
          ? subscription.planSnapshot.creditsPerCycle
          : 0,
      cycleStartsAt: cycle?.cycleStartsAt ?? null,
      cycleEndsAt: cycle?.cycleEndsAt ?? null,
    };
  }

  /**
   * Freezes a membership and pushes the end date out by the same number of
   * days, so the member does not lose time they paid for.
   */
  async freeze(
    id: string,
    input: { from: Date; days: number; reason?: string | null; approvedBy?: string | null }
  ) {
    const subscription = await this.subscriptionModel.findById(this.toObjectId(id));
    if (!subscription) {
      throw new NotFoundException('Membership not found');
    }

    this.assertTransition(subscription, 'frozen');

    if (input.days < 1) {
      throw new BadRequestException('A freeze must be at least one day');
    }

    const remaining = subscription.planSnapshot.freezeDaysAllowed - subscription.freezeDaysUsed;
    if (input.days > remaining) {
      throw new BadRequestException(
        remaining <= 0
          ? 'This membership has no freeze days left'
          : `Only ${remaining} freeze ${remaining === 1 ? 'day is' : 'days are'} left on this membership`
      );
    }

    const from = startOfDay(input.from);
    if (from.getTime() > subscription.endsAt.getTime()) {
      throw new BadRequestException('A freeze cannot start after the membership ends');
    }

    const to = endOfDay(addDays(from, input.days - 1));

    subscription.status = 'frozen';
    subscription.freezes.push({
      _id: new Types.ObjectId(),
      from,
      to,
      days: input.days,
      reason: input.reason ?? null,
      approvedBy: input.approvedBy ? this.toObjectId(input.approvedBy, 'user') : null,
      createdAt: new Date(),
    });
    subscription.freezeDaysUsed += input.days;
    // The whole point of a freeze: the term is paused, not consumed.
    subscription.endsAt = endOfDay(addDays(subscription.endsAt, input.days));

    await subscription.save();

    return {
      success: true,
      message: `Membership frozen for ${input.days} ${input.days === 1 ? 'day' : 'days'}`,
      data: subscription,
    };
  }

  async unfreeze(id: string) {
    const subscription = await this.subscriptionModel.findById(this.toObjectId(id));
    if (!subscription) {
      throw new NotFoundException('Membership not found');
    }

    this.assertTransition(subscription, 'active');

    // Ending a freeze early gives back the days that were not used, and pulls
    // the end date back in by the same amount — otherwise unfreezing early
    // would be a way to extend a membership for nothing.
    const latest = subscription.freezes[subscription.freezes.length - 1];
    if (latest) {
      const now = startOfDay(new Date());

      // Count from whichever is later: today, or the day the freeze was due to
      // begin. Measuring from today alone would count every day between now
      // and a freeze that has not started yet — which really did cut forty
      // days off a membership the first time this was exercised.
      const countFrom = now.getTime() > latest.from.getTime() ? now : latest.from;

      // ...and never give back more than the freeze was worth in the first
      // place. Two guards rather than one because they fail differently: the
      // first handles a future freeze, this one any date arithmetic that
      // drifts past the period's own length.
      const unusedDays = Math.min(latest.days, Math.max(0, daysBetween(countFrom, latest.to)));

      if (unusedDays > 0) {
        subscription.endsAt = endOfDay(addDays(subscription.endsAt, -unusedDays));
        subscription.freezeDaysUsed = Math.max(0, subscription.freezeDaysUsed - unusedDays);

        if (unusedDays >= latest.days) {
          // None of it was ever used, so there is no period to record. Leaving
          // a zero-day freeze in the ledger would make "how many freezes have
          // I taken" wrong for no benefit.
          subscription.freezes.pop();
        } else {
          latest.to = endOfDay(addDays(now, -1));
          latest.days -= unusedDays;
        }
      }
    }

    subscription.status = 'active';
    subscription.classCredits = this.seedCredits(subscription, new Date());
    await subscription.save();

    return {
      success: true,
      message: 'Membership unfrozen',
      data: subscription,
    };
  }

  async cancel(id: string, reason: string | null) {
    const subscription = await this.subscriptionModel.findById(this.toObjectId(id));
    if (!subscription) {
      throw new NotFoundException('Membership not found');
    }

    this.assertTransition(subscription, 'cancelled');

    // Captured before the write. Whether this membership was ever live is
    // what decides if the member hears about it: cancelling a pending one is
    // how an abandoned card payment is cleaned up, and telling someone their
    // membership was cancelled when it never started would be alarming
    // nonsense.
    const wasActive = subscription.status !== 'pending';

    subscription.status = 'cancelled';
    subscription.cancelledAt = new Date();
    subscription.cancellationReason = reason;
    await subscription.save();

    this.events.emit('subscription.cancelled', {
      subscriptionId: (subscription._id as Types.ObjectId).toString(),
      memberId: subscription.member.toString(),
      planName: subscription.planSnapshot.name,
      wasActive,
    });

    return {
      success: true,
      message: 'Membership cancelled',
      data: subscription,
    };
  }

  /**
   * The membership a member is currently entitled to use, or null.
   *
   * Frozen deliberately does not count: a frozen member cannot book or check
   * in, which is what "entitled to use" means everywhere this is called.
   */
  async findActiveForMember(memberId: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel.findOne({
      member: this.toObjectId(memberId, 'member'),
      status: 'active',
      endsAt: { $gte: new Date() },
    });
  }

  /**
   * An unsettled reservation, if this member has one.
   *
   * Lets the reservation form recognise someone coming back to a form they
   * already submitted, and hand them their original reference code rather than
   * raising a second membership against the same person. Newest first, though
   * only one should ever exist.
   */
  async findPendingForMember(memberId: string): Promise<SubscriptionDocument | null> {
    return this.subscriptionModel
      .findOne({ member: this.toObjectId(memberId, 'member'), status: 'pending' })
      .sort({ createdAt: -1 });
  }

  // Everything a member has ever held, newest first — what the member area
  // and the admin member page both show.
  async findAllForMember(memberId: string) {
    const subscriptions = await this.subscriptionModel
      .find({ member: this.toObjectId(memberId, 'member') })
      .sort({ createdAt: -1 })
      .populate('branch', 'name slug')
      .lean();

    return {
      success: true,
      message: 'Memberships retrieved successfully',
      data: subscriptions,
    };
  }

  async findOne(id: string) {
    const subscription = await this.subscriptionModel
      .findById(this.toObjectId(id))
      .populate('branch', 'name slug')
      .populate('member', 'firstName lastName email phone')
      .lean();

    if (!subscription) {
      throw new NotFoundException('Membership not found');
    }

    return {
      success: true,
      message: 'Membership retrieved successfully',
      data: subscription,
    };
  }

  /**
   * Marks memberships that have run past their end date.
   *
   * Frozen ones are included: a freeze pushes endsAt out, so a frozen
   * membership past its end date has genuinely run out and should not sit
   * frozen forever.
   */
  async expireOverdue(): Promise<number> {
    const result = await this.subscriptionModel.updateMany(
      { status: { $in: ['active', 'frozen'] }, endsAt: { $lt: new Date() } },
      { $set: { status: 'expired' } }
    );

    if (result.modifiedCount > 0) {
      this.logger.log(`Expired ${result.modifiedCount} membership(s)`);
    }
    return result.modifiedCount;
  }

  /**
   * Rolls the class-credit allowance for anyone whose cycle has ended.
   *
   * Credits do not accrue — a month's unused classes are gone, which is what
   * "eight classes a month" means. Banking them would turn a capacity plan
   * into an open-ended liability.
   */
  async rollCreditCycles(): Promise<number> {
    const now = new Date();
    const due = await this.subscriptionModel.find({
      status: 'active',
      'planSnapshot.classAccessMode': 'credits',
      'classCredits.cycleEndsAt': { $lt: now },
    });

    let rolled = 0;
    for (const subscription of due) {
      const cycle = currentCycle(subscription.startsAt, subscription.endsAt, now);
      if (!cycle) {
        continue;
      }

      subscription.classCredits = {
        remaining: subscription.planSnapshot.creditsPerCycle,
        cycleStartsAt: cycle.cycleStartsAt,
        cycleEndsAt: cycle.cycleEndsAt,
      };
      await subscription.save();
      rolled += 1;
    }

    if (rolled > 0) {
      this.logger.log(`Rolled the credit cycle for ${rolled} membership(s)`);
    }
    return rolled;
  }

  /**
   * Memberships expiring in exactly `days` days that have not already been
   * warned at that milestone.
   *
   * The already-sent list is what makes the daily sweep safe to re-run: two
   * instances, or a retry after a crash, cannot send the same warning twice.
   */
  async findDueForExpiryReminder(days: number): Promise<SubscriptionDocument[]> {
    const target = startOfDay(addDays(new Date(), days));

    return this.subscriptionModel
      .find({
        status: 'active',
        endsAt: { $gte: target, $lte: endOfDay(target) },
        expiryRemindersSent: { $ne: days },
      })
      .populate('member', 'firstName lastName email emailClassReminders');
  }

  async markReminderSent(id: Types.ObjectId, days: number): Promise<void> {
    await this.subscriptionModel.updateOne(
      { _id: id },
      { $addToSet: { expiryRemindersSent: days } }
    );
  }

  /**
   * Memberships that lapsed roughly a week ago and have not been nudged.
   *
   * Deliberately a window rather than "exactly seven days ago": this runs on
   * a host that sleeps, so a sweep can be missed entirely. A window means a
   * skipped night is caught the next evening instead of the nudge being lost
   * for good, and lapsedNudgeSent stops the window from sending twice.
   *
   * Only sent to members who have not since rejoined — findActiveForMember
   * is checked by the caller, because a renewed member being told we miss
   * them is worse than saying nothing.
   */
  async findDueForLapsedNudge(days = 7): Promise<SubscriptionDocument[]> {
    const target = startOfDay(addDays(new Date(), -days));

    return this.subscriptionModel
      .find({
        status: 'expired',
        endsAt: { $gte: target, $lte: endOfDay(addDays(new Date(), -days + 2)) },
        lapsedNudgeSent: false,
      })
      .populate('member', 'firstName lastName email emailMarketing');
  }

  async markLapsedNudgeSent(id: Types.ObjectId): Promise<void> {
    await this.subscriptionModel.updateOne({ _id: id }, { $set: { lapsedNudgeSent: true } });
  }
}
