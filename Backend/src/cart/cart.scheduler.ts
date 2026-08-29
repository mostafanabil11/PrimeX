import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { CartService } from './cart.service';
import { EmailService } from '@/auth/services/email.service';
import { EmailUtils } from '@/auth/utils/email.utils';
import { ConfigService } from '@/config/config.service';

// How long a cart has to sit untouched, with items still in it, before it
// counts as abandoned.
const ABANDONED_AFTER_MS = 24 * 60 * 60 * 1000;

@Injectable()
export class CartScheduler {
  private readonly logger = new Logger(CartScheduler.name);

  constructor(
    private cartService: CartService,
    private emailService: EmailService,
    private configService: ConfigService
  ) {
    if (!this.configService.shopEnabled) {
      this.logger.log('Shop disabled by feature flag — schedulers are no-ops');
    }
  }

  @Cron(CronExpression.EVERY_HOUR)
  async sendAbandonedCartReminders() {
    if (!this.configService.shopEnabled) return;

    try {
      const carts = await this.cartService.findAbandoned(ABANDONED_AFTER_MS);
      let sent = 0;

      for (const cart of carts) {
        const user = cart.user as any;
        if (!user?.email) continue;

        const resolved = await this.cartService.resolveItems(
          cart.items.map(i => ({
            productId: i.product.toString(),
            size: i.size,
            quantity: i.quantity,
          }))
        );
        const available = resolved.items.filter(i => i.available);
        // Nothing left worth recovering (everything sold out or was
        // deactivated since) — mark it sent anyway so the sweep stops
        // re-checking this cart every hour.
        if (available.length === 0) {
          await this.cartService.markAbandonedEmailSent(cart._id as any);
          continue;
        }

        const cartUrl = new URL('/cart', this.configService.frontendUrl).toString();
        const template = EmailUtils.generateAbandonedCartEmailTemplate(
          user.firstName ?? 'there',
          available.map(i => ({ name: i.name!, color: i.color!, size: i.size, image: i.image })),
          cartUrl
        );

        const ok = await this.emailService.sendAbandonedCartEmail(user.email, template);
        if (ok) {
          await this.cartService.markAbandonedEmailSent(cart._id as any);
          sent += 1;
        }
      }

      if (sent > 0) {
        this.logger.log(`Sent ${sent} abandoned cart reminder(s)`);
      }
    } catch (err) {
      this.logger.error(`Abandoned cart sweep failed: ${(err as Error).message}`);
    }
  }
}
