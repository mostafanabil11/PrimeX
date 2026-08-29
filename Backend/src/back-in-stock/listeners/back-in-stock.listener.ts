import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { Types } from 'mongoose';
import { BackInStockService } from '../back-in-stock.service';
import { EmailService } from '@/auth/services/email.service';
import { EmailUtils } from '@/auth/utils/email.utils';
import { ConfigService } from '@/config/config.service';
import { ProductSize } from '@/products/schemas/product-size-stock.schema';

interface BackInStockPayload {
  productId: Types.ObjectId;
  productName: string;
  productSlug: string;
  size: ProductSize;
}

@Injectable()
export class BackInStockListener {
  private readonly logger = new Logger(BackInStockListener.name);

  constructor(
    private backInStockService: BackInStockService,
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  @OnEvent('product.back_in_stock')
  async handleBackInStock(payload: BackInStockPayload) {
    const pending = await this.backInStockService.claimPendingForRestock(
      payload.productId,
      payload.size
    );
    if (pending.length === 0) {
      return;
    }

    const productUrl = new URL(
      `/products/${payload.productSlug}`,
      this.configService.frontendUrl
    ).toString();
    const template = EmailUtils.generateBackInStockEmailTemplate(
      payload.productName,
      payload.size,
      productUrl
    );

    for (const request of pending) {
      await this.emailService.sendBackInStockEmail(request.email, payload.productName, template);
    }
    this.logger.log(
      `Notified ${pending.length} back-in-stock request(s) for ${payload.productName} (${payload.size})`
    );
  }
}
