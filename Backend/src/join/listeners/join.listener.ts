import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { User, UserDocument } from '@/auth/schemas/user.schema';
import { SubscriptionsService } from '@/subscriptions/subscriptions.service';
import { EmailService } from '@/auth/services/email.service';
import { EmailUtils } from '@/auth/utils/email.utils';
import { ConfigService } from '@/config/config.service';

interface InvoicePaidPayload {
  invoiceId: string;
  subscriptionId: string | null;
  memberId: string;
  invoiceNumber: string;
}

interface InvoiceFailedPayload {
  invoiceId: string;
  subscriptionId: string | null;
}

interface SubscriptionCancelledPayload {
  subscriptionId: string;
  memberId: string;
  planName: string;
  // False when the membership never activated — an abandoned card payment
  // being cleaned up rather than a member cancelling something they had.
  wasActive: boolean;
}

@Injectable()
export class JoinListener {
  private readonly logger = new Logger(JoinListener.name);

  constructor(
    @InjectModel(User.name) private userModel: Model<UserDocument>,
    private subscriptionsService: SubscriptionsService,
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  /**
   * Turns a settled invoice into an active membership.
   *
   * Every step is idempotent, because this can genuinely run twice: Paymob
   * retries webhooks, and the browser redirect processes the same transaction
   * in parallel. activate() returns unchanged if already active, the role
   * update is a $set, and the referral code is only generated when absent.
   */
  @OnEvent('invoice.paid')
  async handleInvoicePaid(payload: InvoicePaidPayload) {
    if (!payload.subscriptionId) {
      // A paid invoice with nothing attached is a PT package or, later, a
      // shop-adjacent purchase. Nothing to provision here.
      return;
    }

    const subscription = await this.subscriptionsService.activate(payload.subscriptionId);

    const user = await this.userModel.findById(payload.memberId);
    if (!user) {
      this.logger.error(
        `Invoice ${payload.invoiceNumber} paid but member ${payload.memberId} no longer exists`
      );
      return;
    }

    const updates: Record<string, unknown> = {};

    // Staff and admins keep their role — being promoted to 'member' would
    // quietly demote an admin who bought a membership.
    if (user.role === 'member' || !user.role) {
      updates.role = 'member';
    }

    // Generated once and then stable. A referral code that changed would
    // invalidate every share of it the member had already made.
    if (!user.referralCode) {
      updates.referralCode = await this.generateReferralCode(user);
    }

    if (Object.keys(updates).length > 0) {
      await this.userModel.updateOne({ _id: user._id }, { $set: updates });
    }

    // Everything above this line — activating, the role, the referral code —
    // is the membership actually turning on, and must not depend on there
    // being an address to write to. A member signed up at the front desk over
    // WhatsApp often has no email at all; that is a normal membership, just a
    // quiet one.
    if (user.email) {
      const memberUrl = new URL('/account', this.configService.frontendUrl).toString();
      await this.emailService.send(
        user.email,
        `Welcome to ${this.configService.brandName}`,
        EmailUtils.generateMembershipWelcomeTemplate(
          user.firstName,
          subscription.planSnapshot.name,
          subscription.startsAt,
          subscription.endsAt,
          memberUrl
        ),
        'Membership welcome'
      );

      await this.emailService.send(
        user.email,
        `Receipt ${payload.invoiceNumber}`,
        EmailUtils.generateInvoiceReceiptTemplate(user.firstName, payload.invoiceNumber, memberUrl),
        'Invoice receipt'
      );
    }

    const who = user.email ?? `member ${user.memberNumber ?? user._id}`;
    this.logger.log(
      `Membership activated for ${who}: ${subscription.planSnapshot.name}, ends ${subscription.endsAt.toISOString().slice(0, 10)}${user.email ? '' : ' — no email on file, nothing sent'}`
    );
  }

  /**
   * A card that never went through leaves a pending subscription behind.
   * Cancelling it is what lets the member start again — otherwise the join
   * flow tells them they already have one in progress, forever.
   */
  @OnEvent('invoice.failed')
  async handleInvoiceFailed(payload: InvoiceFailedPayload) {
    if (!payload.subscriptionId) {
      return;
    }

    try {
      await this.subscriptionsService.cancel(payload.subscriptionId, 'Payment was not completed');
      this.logger.log(`Released pending membership for failed invoice ${payload.invoiceId}`);
    } catch (err) {
      // Already cancelled or already active — either way there is nothing to
      // release, and a failed cleanup must not take down the payment callback.
      this.logger.warn(
        `Could not release membership for invoice ${payload.invoiceId}: ${(err as Error).message}`
      );
    }
  }

  /**
   * Confirms a cancellation to the member.
   *
   * Only for memberships that were actually live — see wasActive where the
   * event is emitted. A never-activated one is an abandoned card payment
   * being tidied up, and the member should hear nothing about it.
   */
  @OnEvent('subscription.cancelled')
  async handleSubscriptionCancelled(payload: SubscriptionCancelledPayload) {
    if (!payload.wasActive) {
      return;
    }

    try {
      const user = await this.userModel.findById(payload.memberId).select('firstName email');
      if (!user?.email) {
        return;
      }

      await this.emailService.send(
        user.email,
        'Your membership has been cancelled',
        EmailUtils.generateMembershipCancelledTemplate(user.firstName ?? 'there', payload.planName),
        'Membership cancelled'
      );
    } catch (err) {
      this.logger.error(
        `Cancellation email failed for subscription ${payload.subscriptionId}: ${(err as Error).message}`
      );
    }
  }

  // Readable rather than random-looking: members read these out. Retried on
  // the vanishingly unlikely collision rather than assumed unique.
  private async generateReferralCode(user: UserDocument): Promise<string> {
    const base = user.firstName
      .toUpperCase()
      .replace(/[^A-Z]/g, '')
      .slice(0, 6);

    for (let attempt = 0; attempt < 5; attempt++) {
      const suffix = randomBytes(2).toString('hex').toUpperCase();
      const code = `${base || 'MEMBER'}${suffix}`;
      const taken = await this.userModel.exists({ referralCode: code });
      if (!taken) {
        return code;
      }
    }

    return `MEMBER${(user._id as Types.ObjectId).toString().slice(-6).toUpperCase()}`;
  }
}
