import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { OrdersService } from './orders.service';
import { ConfigService } from '@/config/config.service';

@Injectable()
export class OrdersScheduler {
  private readonly logger = new Logger(OrdersScheduler.name);

  constructor(
    private ordersService: OrdersService,
    private configService: ConfigService
  ) {
    if (!this.configService.shopEnabled) {
      this.logger.log('Shop disabled by feature flag — schedulers are no-ops');
    }
  }

  // Card checkouts reserve stock so the customer can't lose the item while
  // typing their card details — but a closed tab would otherwise hold that
  // stock forever. This puts it back once the payment window has lapsed.
  @Cron(CronExpression.EVERY_MINUTE)
  async releaseExpiredCardReservations() {
    if (!this.configService.shopEnabled) return;

    try {
      const released = await this.ordersService.releaseExpiredCardOrders();
      if (released > 0) {
        this.logger.log(`Released stock from ${released} expired card checkout(s)`);
      }
    } catch (err) {
      // A sweeper failure must never take the process down — the next tick
      // will retry, and the reservation stays claimable until it succeeds.
      this.logger.error(`Failed to release expired card reservations: ${(err as Error).message}`);
    }
  }
}
