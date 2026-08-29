import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { User, UserDocument } from '@/auth/schemas/user.schema';
import { ClassSession, ClassSessionDocument } from '@/classes/schemas/class-session.schema';
import { Subscription, SubscriptionDocument } from '@/subscriptions/schemas/subscription.schema';
import { EmailService } from '@/auth/services/email.service';
import { EmailUtils } from '@/auth/utils/email.utils';
import { ConfigService } from '@/config/config.service';
import { GYM_TIMEZONE } from '@/common/utils/timezone.util';

interface BookingCreatedPayload {
  bookingId: string;
  memberId: string;
  sessionId: string;
}

interface BookingCancelledPayload {
  bookingId: string;
  memberId: string;
  sessionId: string;
  creditReturned: boolean;
}

interface SessionCancelledPayload {
  sessionId: string;
  affected: string[];
  reason: string | null;
}

/**
 * Booking email. Everything here is a courtesy on top of an action that has
 * already succeeded and been persisted, so a send that fails must never
 * surface as a failed booking — every handler swallows its own errors and
 * logs them instead.
 */
@Injectable()
export class BookingsListener {
  private readonly logger = new Logger(BookingsListener.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    @InjectModel(ClassSession.name) private sessionModel: Model<ClassSessionDocument>,
    @InjectModel(Subscription.name) private subscriptionModel: Model<SubscriptionDocument>,
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  /**
   * The gym's wall-clock time, which is the only time a member cares about.
   * Derived here once per email rather than in the templates, so all four
   * agree and none of them has to know about timezones.
   */
  private describeWhen(startsAt: Date): string {
    return startsAt.toLocaleString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
      timeZone: GYM_TIMEZONE,
    });
  }

  private async loadSession(sessionId: string) {
    return this.sessionModel
      .findById(sessionId)
      .populate('classType', 'name')
      .populate('branch', 'name');
  }

  private nameOf(ref: unknown, fallback: string): string {
    return (ref as { name?: string })?.name ?? fallback;
  }

  private url(path: string): string {
    return new URL(path, this.configService.frontendUrl).toString();
  }

  @OnEvent('booking.created')
  async handleBookingCreated(payload: BookingCreatedPayload) {
    try {
      const [user, session] = await Promise.all([
        this.userModel.findById(payload.memberId).select('firstName email'),
        this.loadSession(payload.sessionId),
      ]);
      if (!user?.email || !session) {
        return;
      }

      // Only shown when the plan actually meters classes. On an unlimited
      // plan a "credits left" row would be noise, and on a gym-floor-only
      // plan it would be a number that means nothing.
      const subscription = await this.subscriptionModel
        .findOne({ member: new Types.ObjectId(payload.memberId), status: 'active' })
        .select('planSnapshot.classAccessMode classCredits.remaining');
      const creditsRemaining =
        subscription?.planSnapshot?.classAccessMode === 'credits'
          ? (subscription.classCredits?.remaining ?? 0)
          : null;

      await this.emailService.send(
        user.email,
        `Booked: ${this.nameOf(session.classType, 'your class')}`,
        EmailUtils.generateBookingConfirmedTemplate(
          user.firstName ?? 'there',
          this.nameOf(session.classType, 'your class'),
          this.describeWhen(session.startsAt),
          this.nameOf(session.branch, 'the gym'),
          creditsRemaining,
          this.url('/account/classes')
        ),
        'Booking confirmation'
      );
    } catch (err) {
      this.logger.error(
        `Booking confirmation email failed for booking ${payload.bookingId}: ${(err as Error).message}`
      );
    }
  }

  @OnEvent('booking.cancelled')
  async handleBookingCancelled(payload: BookingCancelledPayload) {
    try {
      const [user, session] = await Promise.all([
        this.userModel.findById(payload.memberId).select('firstName email'),
        this.loadSession(payload.sessionId),
      ]);
      if (!user?.email || !session) {
        return;
      }

      await this.emailService.send(
        user.email,
        `Cancelled: ${this.nameOf(session.classType, 'your class')}`,
        EmailUtils.generateBookingCancelledTemplate(
          user.firstName ?? 'there',
          this.nameOf(session.classType, 'your class'),
          this.describeWhen(session.startsAt),
          payload.creditReturned,
          this.url('/schedule')
        ),
        'Booking cancellation'
      );
    } catch (err) {
      this.logger.error(
        `Cancellation email failed for booking ${payload.bookingId}: ${(err as Error).message}`
      );
    }
  }

  /**
   * The gym called the class off. Everyone booked is told, individually.
   *
   * Sent in sequence rather than in parallel: a full class is a few dozen
   * members, and firing that many concurrent sends at a free-tier mail
   * provider is how a rate limit turns into nobody being told.
   */
  @OnEvent('session.cancelled')
  async handleSessionCancelled(payload: SessionCancelledPayload) {
    try {
      const session = await this.loadSession(payload.sessionId);
      if (!session || payload.affected.length === 0) {
        return;
      }

      const members = await this.userModel
        .find({ _id: { $in: payload.affected.map(id => new Types.ObjectId(id)) } })
        .select('firstName email');

      const className = this.nameOf(session.classType, 'your class');
      const when = this.describeWhen(session.startsAt);
      let sent = 0;

      for (const member of members) {
        if (!member.email) continue;
        const ok = await this.emailService.send(
          member.email,
          `Cancelled: ${className}`,
          EmailUtils.generateSessionCancelledTemplate(
            member.firstName ?? 'there',
            className,
            when,
            payload.reason,
            this.url('/schedule')
          ),
          'Session cancelled'
        );
        if (ok) sent++;
      }

      this.logger.log(`Session ${payload.sessionId} cancelled: notified ${sent}/${members.length}`);
    } catch (err) {
      this.logger.error(
        `Session-cancelled emails failed for ${payload.sessionId}: ${(err as Error).message}`
      );
    }
  }
}
