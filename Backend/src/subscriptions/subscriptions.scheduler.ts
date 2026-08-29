import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { Types } from 'mongoose';
import { SubscriptionsService } from './subscriptions.service';
import { InvoicesService } from '@/invoices/invoices.service';
import { EmailService } from '@/auth/services/email.service';
import { EmailUtils } from '@/auth/utils/email.utils';
import { ConfigService } from '@/config/config.service';

// How far ahead members are warned. Three touches: enough notice to act on,
// a reminder, and a last call. Nothing renews automatically, so these are the
// only thing standing between a member and an unnoticed lapse.
const REMINDER_DAYS = [14, 7, 1];

@Injectable()
export class SubscriptionsScheduler {
  private readonly logger = new Logger(SubscriptionsScheduler.name);

  constructor(
    private subscriptionsService: SubscriptionsService,
    private invoicesService: InvoicesService,
    private emailService: EmailService,
    private configService: ConfigService
  ) {
    if (!this.configService.membershipSalesEnabled) {
      this.logger.log('Membership sales disabled by feature flag — schedulers are no-ops');
    }
  }

  /**
   * Closes card invoices whose Paymob window has lapsed.
   *
   * Runs every minute rather than daily because the cost of leaving one open
   * is that the member cannot start again — the join flow sees a membership
   * already in progress and refuses.
   */
  @Cron(CronExpression.EVERY_MINUTE)
  async closeAbandonedInvoices() {
    if (!this.configService.membershipSalesEnabled) return;

    try {
      await this.invoicesService.failExpiredCardInvoices();
    } catch (err) {
      // A sweeper failure must never take the process down. The next tick
      // retries, and nothing is lost in the meantime.
      this.logger.error(`Failed to close abandoned invoices: ${(err as Error).message}`);
    }
  }

  /**
   * The daily membership pass: expire what has run out, roll credit cycles,
   * and send the expiry warnings.
   *
   * Three in one cron rather than three crons, in this order deliberately —
   * expiring first means a membership that ended overnight is not also sent a
   * "one day left" warning on its way out.
   */
  @Cron(CronExpression.EVERY_DAY_AT_2AM)
  async dailyMembershipPass() {
    if (!this.configService.membershipSalesEnabled) return;

    try {
      await this.subscriptionsService.expireOverdue();
    } catch (err) {
      this.logger.error(`Failed to expire memberships: ${(err as Error).message}`);
    }

    try {
      await this.subscriptionsService.rollCreditCycles();
    } catch (err) {
      this.logger.error(`Failed to roll credit cycles: ${(err as Error).message}`);
    }

    try {
      await this.sendExpiryReminders();
    } catch (err) {
      this.logger.error(`Failed to send expiry reminders: ${(err as Error).message}`);
    }

    // Last, and after expireOverdue above, so a membership that lapsed
    // overnight is already in the right state to be counted.
    try {
      await this.sendLapsedNudges();
    } catch (err) {
      this.logger.error(`Failed to send lapsed nudges: ${(err as Error).message}`);
    }
  }

  /**
   * One "we have not seen you" a week after a membership lapses.
   *
   * Skipped for anyone who has since rejoined, and for anyone who turned
   * marketing email off — this is a win-back, not a service message, so the
   * preference genuinely applies to it.
   */
  private async sendLapsedNudges(): Promise<void> {
    const renewUrl = new URL('/membership', this.configService.frontendUrl).toString();
    const due = await this.subscriptionsService.findDueForLapsedNudge();
    let sent = 0;

    for (const subscription of due) {
      const member = subscription.member as unknown as {
        _id: Types.ObjectId;
        firstName?: string;
        email?: string;
        emailMarketing?: boolean;
      };

      // Marked done in every early-exit branch, so a member who cannot or
      // should not receive it is not reconsidered every night.
      const markDone = () =>
        this.subscriptionsService.markLapsedNudgeSent(subscription._id as Types.ObjectId);

      if (!member?.email || member.emailMarketing === false) {
        await markDone();
        continue;
      }

      // Rejoined since lapsing — saying "we miss you" to a paying member
      // reads as nobody being in control of the data.
      const active = await this.subscriptionsService.findActiveForMember(member._id.toString());
      if (active) {
        await markDone();
        continue;
      }

      await this.emailService.send(
        member.email,
        'We have not seen you',
        EmailUtils.generateLapsedNudgeTemplate(
          member.firstName ?? 'there',
          subscription.planSnapshot.name,
          renewUrl
        ),
        'Lapsed nudge'
      );

      await markDone();
      sent++;
    }

    if (sent > 0) {
      this.logger.log(`Lapsed nudges: ${sent} sent`);
    }
  }

  private async sendExpiryReminders(): Promise<void> {
    const renewUrl = new URL('/membership', this.configService.frontendUrl).toString();
    let sent = 0;

    for (const days of REMINDER_DAYS) {
      const due = await this.subscriptionsService.findDueForExpiryReminder(days);

      for (const subscription of due) {
        const member = subscription.member as unknown as {
          _id: Types.ObjectId;
          firstName?: string;
          email?: string;
        };

        // A membership whose member was deleted has nowhere to send to. Mark
        // it done so the sweep does not retry it every night forever.
        if (!member?.email) {
          await this.subscriptionsService.markReminderSent(
            subscription._id as Types.ObjectId,
            days
          );
          continue;
        }

        await this.emailService.send(
          member.email,
          days === 1 ? 'Your membership ends tomorrow' : `Your membership ends in ${days} days`,
          EmailUtils.generateExpiryReminderTemplate(
            member.firstName ?? 'there',
            subscription.planSnapshot.name,
            subscription.endsAt,
            days,
            renewUrl
          ),
          'Expiry reminder'
        );

        // Recorded per milestone, which is what makes the whole sweep safe to
        // re-run: a retry after a crash, or two instances, cannot send the
        // same warning twice.
        await this.subscriptionsService.markReminderSent(subscription._id as Types.ObjectId, days);
        sent += 1;
      }
    }

    if (sent > 0) {
      this.logger.log(`Sent ${sent} expiry reminder(s)`);
    }
  }
}
