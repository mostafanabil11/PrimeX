import {
  Injectable,
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { ClassSession, ClassSessionDocument } from '@/classes/schemas/class-session.schema';
import { Subscription, SubscriptionDocument } from '@/subscriptions/schemas/subscription.schema';
import { SettingsService } from '@/settings/settings.service';

const MS_PER_HOUR = 60 * 60 * 1000;

@Injectable()
export class BookingsService {
  private readonly logger = new Logger(BookingsService.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(ClassSession.name) private sessionModel: Model<ClassSessionDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private settingsService: SettingsService,
    private events: EventEmitter2
  ) {}

  private toObjectId(id: string, label = 'booking'): Types.ObjectId {
    if (!Types.ObjectId.isValid(id)) {
      throw new BadRequestException(`Invalid ${label} id`);
    }
    return new Types.ObjectId(id);
  }

  /**
   * Books a member onto a session.
   *
   * The order matters. Everything that can be refused is checked first, then
   * the credit is taken, and only then is the place claimed — because claiming
   * a place is the step that has to be atomic, and unwinding it is the one
   * thing we would rather not have to do.
   */
  async book(memberId: string, sessionId: string) {
    const settings = (await this.settingsService.getSettings()).data;

    const session = await this.sessionModel.findById(this.toObjectId(sessionId, 'session'));
    if (!session) {
      throw new NotFoundException('That class is not on the timetable');
    }
    if (session.status !== 'scheduled') {
      throw new ConflictException(
        session.status === 'cancelled'
          ? 'That class has been cancelled'
          : 'That class has already finished'
      );
    }

    const now = new Date();
    const hoursUntil = (session.startsAt.getTime() - now.getTime()) / MS_PER_HOUR;

    if (hoursUntil < settings.bookingCutoffHours) {
      throw new BadRequestException(
        hoursUntil < 0
          ? 'That class has already started'
          : `Booking closes ${settings.bookingCutoffHours} hour${settings.bookingCutoffHours === 1 ? '' : 's'} before a class starts`
      );
    }

    const daysUntil = hoursUntil / 24;
    if (daysUntil > settings.bookingHorizonDays) {
      throw new BadRequestException(
        `The timetable opens ${settings.bookingHorizonDays} days ahead`
      );
    }

    const subscription = await this.subscriptionModel.findOne({
      member: this.toObjectId(memberId, 'member'),
      status: 'active',
      endsAt: { $gte: now },
    });

    if (!subscription) {
      throw new ForbiddenException(
        'You need an active membership to book a class. Renew or join to get started.'
      );
    }

    // The membership has to still be running when the class happens, not just
    // today — otherwise someone in their last week could fill next month.
    if (subscription.endsAt.getTime() < session.startsAt.getTime()) {
      throw new ForbiddenException('That class is after your membership ends');
    }

    if (
      subscription.planSnapshot.branchAccess === 'single' &&
      subscription.branch.toString() !== session.branch.toString()
    ) {
      throw new ForbiddenException(
        'Your plan covers your home branch only. Upgrade to train at every branch.'
      );
    }

    if (subscription.planSnapshot.classAccessMode === 'none') {
      throw new ForbiddenException(
        'Your plan does not include classes. Upgrade to book onto the timetable.'
      );
    }

    await this.assertNotSuspended(memberId, settings.noShowLimit, settings.noShowSuspensionDays);

    const concurrent = await this.bookingModel.countDocuments({
      member: this.toObjectId(memberId, 'member'),
      status: 'booked',
      sessionStartsAt: { $gte: now },
    });
    if (concurrent >= settings.maxConcurrentBookings) {
      throw new BadRequestException(
        `You can hold ${settings.maxConcurrentBookings} bookings at a time. Cancel one to book another.`
      );
    }

    const existing = await this.bookingModel.findOne({
      member: this.toObjectId(memberId, 'member'),
      session: session._id,
      status: { $in: ['booked', 'attended', 'no_show'] },
    });
    if (existing) {
      throw new ConflictException('You are already booked onto that class');
    }

    // --- Credit ---
    //
    // Taken before the place is claimed, and conditionally, so two requests
    // cannot both spend the last credit. If the place then turns out to be
    // gone, this is handed straight back below.
    const needsCredit = subscription.planSnapshot.classAccessMode === 'credits';
    if (needsCredit) {
      const spent = await this.subscriptionModel.findOneAndUpdate(
        { _id: subscription._id, 'classCredits.remaining': { $gte: 1 } },
        { $inc: { 'classCredits.remaining': -1 } },
        { new: true }
      );

      if (!spent) {
        throw new ForbiddenException(
          'You have used all your classes for this month. They reset at the start of your next cycle.'
        );
      }
    }

    // --- The place ---
    //
    // The same conditional-update trick the storefront uses for the last item
    // of stock: the filter includes the capacity check, so whichever request
    // the database serialises second finds nothing to match and is told the
    // class is full — rather than both incrementing past capacity.
    const claimed = await this.sessionModel.findOneAndUpdate(
      {
        _id: session._id,
        status: 'scheduled',
        $expr: { $lt: ['$bookedCount', '$capacity'] },
      },
      { $inc: { bookedCount: 1 } },
      { new: true }
    );

    if (!claimed) {
      if (needsCredit) {
        await this.subscriptionModel.updateOne(
          { _id: subscription._id },
          { $inc: { 'classCredits.remaining': 1 } }
        );
      }
      throw new ConflictException('That class just filled up');
    }

    try {
      const booking = await this.bookingModel.create({
        member: this.toObjectId(memberId, 'member'),
        session: session._id,
        subscription: subscription._id,
        status: 'booked',
        creditConsumed: needsCredit,
        sessionStartsAt: session.startsAt,
      });

      this.events.emit('booking.created', {
        bookingId: (booking._id as Types.ObjectId).toString(),
        memberId,
        sessionId: (session._id as Types.ObjectId).toString(),
      });

      return {
        success: true,
        message: 'Booked',
        data: booking,
      };
    } catch (err) {
      // The booking row failed after the place and the credit were taken.
      // Give both back rather than leaving a seat held by nothing.
      await this.sessionModel.updateOne({ _id: session._id }, { $inc: { bookedCount: -1 } });
      if (needsCredit) {
        await this.subscriptionModel.updateOne(
          { _id: subscription._id },
          { $inc: { 'classCredits.remaining': 1 } }
        );
      }

      // A duplicate key here means the member double-clicked and the unique
      // index caught the second one — which is the index doing its job.
      if ((err as { code?: number }).code === 11000) {
        throw new ConflictException('You are already booked onto that class');
      }
      throw err;
    }
  }

  /**
   * Cancels a booking and gives the place back.
   *
   * Whether the credit comes back depends on the window. Inside it, the place
   * can still be filled by someone else and the member loses nothing. Outside
   * it, the seat is effectively wasted, and that is what the window is for.
   */
  async cancel(memberId: string, bookingId: string) {
    const settings = (await this.settingsService.getSettings()).data;

    const booking = await this.bookingModel.findOne({
      _id: this.toObjectId(bookingId),
      member: this.toObjectId(memberId, 'member'),
    });

    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status !== 'booked') {
      throw new ConflictException(
        booking.status === 'cancelled'
          ? 'That booking is already cancelled'
          : 'That class has already happened'
      );
    }

    const hoursUntil = (booking.sessionStartsAt.getTime() - Date.now()) / MS_PER_HOUR;
    const withinWindow = hoursUntil >= settings.freeCancellationWindowHours;

    booking.status = 'cancelled';
    booking.cancelledAt = new Date();
    await booking.save();

    // Free the seat regardless — a late cancellation still should not hold a
    // place nobody is going to use. Floored at zero so a double cancel or a
    // manual fix cannot drive the count negative.
    await this.sessionModel.updateOne(
      { _id: booking.session, bookedCount: { $gte: 1 } },
      { $inc: { bookedCount: -1 } }
    );

    if (booking.creditConsumed && withinWindow) {
      await this.subscriptionModel.updateOne(
        { _id: booking.subscription },
        { $inc: { 'classCredits.remaining': 1 } }
      );
    }

    this.events.emit('booking.cancelled', {
      bookingId: (booking._id as Types.ObjectId).toString(),
      memberId,
      sessionId: booking.session.toString(),
      creditReturned: booking.creditConsumed && withinWindow,
    });

    return {
      success: true,
      message: withinWindow
        ? 'Cancelled. Your class credit has been returned.'
        : `Cancelled. This was inside the ${settings.freeCancellationWindowHours}-hour window, so the class still counts.`,
      data: { creditReturned: booking.creditConsumed && withinWindow },
    };
  }

  // Consecutive no-shows, counted over recent history. Zero disables the
  // penalty entirely, which is what a gym that would rather not police it can
  // set in the admin settings.
  private async assertNotSuspended(
    memberId: string,
    noShowLimit: number,
    suspensionDays: number
  ): Promise<void> {
    if (noShowLimit <= 0) {
      return;
    }

    const since = new Date(Date.now() - suspensionDays * 24 * MS_PER_HOUR);
    const noShows = await this.bookingModel.countDocuments({
      member: this.toObjectId(memberId, 'member'),
      status: 'no_show',
      sessionStartsAt: { $gte: since },
    });

    if (noShows >= noShowLimit) {
      throw new ForbiddenException(
        `Booking is paused for ${suspensionDays} days after ${noShowLimit} missed classes. Talk to the front desk and we will sort it out.`
      );
    }
  }

  async findMine(memberId: string, scope: 'upcoming' | 'past') {
    const now = new Date();
    const bookings = await this.bookingModel
      .find({
        member: this.toObjectId(memberId, 'member'),
        ...(scope === 'upcoming'
          ? { status: 'booked', sessionStartsAt: { $gte: now } }
          : { sessionStartsAt: { $lt: now } }),
      })
      .sort({ sessionStartsAt: scope === 'upcoming' ? 1 : -1 })
      .limit(scope === 'upcoming' ? 50 : 100)
      .populate({
        path: 'session',
        populate: [
          { path: 'classType', select: 'name slug durationMinutes colorToken' },
          { path: 'branch', select: 'name slug' },
          { path: 'trainer', select: 'name slug' },
        ],
      })
      .lean();

    return {
      success: true,
      message: 'Bookings retrieved successfully',
      data: bookings,
    };
  }

  /** The roster for one session, for staff and the coach taking it. */
  async findForSession(sessionId: string) {
    const bookings = await this.bookingModel
      .find({
        session: this.toObjectId(sessionId, 'session'),
        status: { $in: ['booked', 'attended', 'no_show'] },
      })
      .sort({ createdAt: 1 })
      .populate('member', 'firstName lastName phone parQ')
      .lean();

    return {
      success: true,
      message: 'Roster retrieved successfully',
      data: bookings,
    };
  }

  /**
   * Marks attendance. Deliberately does not touch capacity or credits — the
   * class has happened, the seat was used either way, and a no-show that
   * refunded a credit would remove the only cost of not turning up.
   */
  async markAttendance(bookingId: string, attended: boolean) {
    const booking = await this.bookingModel.findById(this.toObjectId(bookingId));
    if (!booking) {
      throw new NotFoundException('Booking not found');
    }
    if (booking.status === 'cancelled') {
      throw new ConflictException('That booking was cancelled');
    }

    booking.status = attended ? 'attended' : 'no_show';
    booking.attendanceMarkedAt = new Date();
    await booking.save();

    return {
      success: true,
      message: attended ? 'Marked as attended' : 'Marked as a no-show',
      data: booking,
    };
  }

  /**
   * Releases every booking on a session the gym cancelled.
   *
   * Always refunds, regardless of the window: the member did nothing wrong,
   * and charging them a credit for a class we called off would be indefensible.
   */
  async releaseSessionBookings(
    sessionId: Types.ObjectId,
    reason: string | null = null
  ): Promise<number> {
    const bookings = await this.bookingModel.find({ session: sessionId, status: 'booked' });

    for (const booking of bookings) {
      booking.status = 'cancelled';
      booking.cancelledAt = new Date();
      booking.cancelledByGym = true;
      await booking.save();

      if (booking.creditConsumed) {
        await this.subscriptionModel.updateOne(
          { _id: booking.subscription },
          { $inc: { 'classCredits.remaining': 1 } }
        );
      }
    }

    if (bookings.length > 0) {
      this.events.emit('session.cancelled', {
        sessionId: sessionId.toString(),
        affected: bookings.map(b => b.member.toString()),
        reason,
      });
      this.logger.log(`Released ${bookings.length} booking(s) from a cancelled session`);
    }

    return bookings.length;
  }
}
