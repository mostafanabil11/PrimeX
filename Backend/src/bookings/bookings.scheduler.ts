import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Booking, BookingDocument } from './schemas/booking.schema';
import { User, UserDocument } from '@/auth/schemas/user.schema';
import { EmailService } from '@/auth/services/email.service';
import { EmailUtils } from '@/auth/utils/email.utils';
import { ConfigService } from '@/config/config.service';
import { GYM_TIMEZONE } from '@/common/utils/timezone.util';

const MS_PER_HOUR = 60 * 60 * 1000;

// How far ahead the reminder looks. Runs in the evening and covers the next
// 24 hours, so an early-morning class and a late-evening one both get the
// same one night of warning.
const LOOKAHEAD_HOURS = 24;

@Injectable()
export class BookingsScheduler {
  private readonly logger = new Logger(BookingsScheduler.name);

  constructor(
    @InjectModel(Booking.name) private bookingModel: Model<BookingDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private emailService: EmailService,
    private configService: ConfigService
  ) {
    if (!this.configService.classBookingEnabled) {
      this.logger.log('Class booking disabled by feature flag — schedulers are no-ops');
    }
  }

  /**
   * The evening-before class reminder.
   *
   * 6PM rather than a round midnight: a reminder that lands the previous
   * evening is one somebody can still act on, and cancelling then frees the
   * place while another member might still take it.
   *
   * Idempotent through reminderSentAt — see the field's own comment. That
   * matters more than usual on a free host, where the process can restart
   * mid-sweep at any time.
   */
  @Cron('0 18 * * *', { timeZone: GYM_TIMEZONE })
  async sendClassReminders(): Promise<number> {
    if (!this.configService.classBookingEnabled) return 0;

    const now = new Date();
    const horizon = new Date(now.getTime() + LOOKAHEAD_HOURS * MS_PER_HOUR);

    const due = await this.bookingModel
      .find({
        status: 'booked',
        reminderSentAt: null,
        sessionStartsAt: { $gt: now, $lte: horizon },
      })
      .populate({ path: 'session', populate: [{ path: 'classType' }, { path: 'branch' }] });

    if (due.length === 0) {
      return 0;
    }

    const memberIds = [...new Set(due.map(b => b.member.toString()))];
    const members = await this.userModel
      .find({ _id: { $in: memberIds.map(id => new Types.ObjectId(id)) } })
      .select('firstName email emailClassReminders');
    const byId = new Map(members.map(m => [(m._id as Types.ObjectId).toString(), m]));

    let sent = 0;

    for (const booking of due) {
      const member = byId.get(booking.member.toString());
      const session = booking.session as unknown as {
        startsAt?: Date;
        classType?: { name?: string };
        branch?: { name?: string };
      } | null;

      // Stamp regardless of whether an email actually goes out. A member who
      // turned reminders off, or whose account is gone, should not be
      // reconsidered by every subsequent sweep for the rest of the horizon.
      const markSent = () =>
        this.bookingModel.updateOne({ _id: booking._id }, { $set: { reminderSentAt: new Date() } });

      if (!member?.email || !session?.startsAt) {
        await markSent();
        continue;
      }

      // Honours the member's notification preference, which is the whole
      // point of having the toggle in Profile & Settings.
      if (member.emailClassReminders === false) {
        await markSent();
        continue;
      }

      const when = session.startsAt.toLocaleString('en-GB', {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
        timeZone: GYM_TIMEZONE,
      });

      const ok = await this.emailService.send(
        member.email,
        `Tomorrow: ${session.classType?.name ?? 'your class'}`,
        EmailUtils.generateClassReminderTemplate(
          member.firstName ?? 'there',
          session.classType?.name ?? 'your class',
          when,
          session.branch?.name ?? 'the gym',
          new URL('/account/classes', this.configService.frontendUrl).toString()
        ),
        'Class reminder'
      );

      await markSent();
      if (ok) sent++;
    }

    this.logger.log(`Class reminders: ${sent}/${due.length} sent`);
    return sent;
  }
}
