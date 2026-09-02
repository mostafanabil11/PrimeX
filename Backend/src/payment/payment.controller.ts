import { Controller, Get, Post, Body, Query, Res, HttpCode, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';

import { PaymentService } from './payment.service';
import { InvoicesService } from '@/invoices/invoices.service';
import { ConfigService } from '@/config/config.service';
import { Public } from '@/auth/decorators/public.decorator';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Payments')
// With the flag off there is nothing legitimate for Paymob to call back
// about — no invoice could have been created to begin with.
@Feature('membershipSales')
@Controller('payments/paymob')
// Paymob calls this as often as it needs to (including retries on non-2xx);
// throttling it would cause dropped payment confirmations.
@SkipThrottle()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private paymentService: PaymentService,
    private invoicesService: InvoicesService,
    private configService: ConfigService
  ) {}

  // Server-to-server callback — the authoritative source of payment truth.
  // Paymob sends the transaction under `obj` in the body, but the HMAC as a
  // QUERY PARAMETER, which is easy to miss and makes verification silently
  // fail if you look for it in the body.
  @Public()
  @Post('webhook')
  @HttpCode(200)
  @ApiOperation({ summary: 'Paymob transaction webhook (server-to-server)' })
  async handleWebhook(@Body() body: any, @Query('hmac') hmacFromQuery?: string) {
    const obj = body?.obj;
    if (!obj) {
      this.logger.warn('Paymob webhook received with no transaction object');
      return { received: true };
    }

    // Body `hmac` is a fallback only — the query param is where Paymob
    // actually puts it.
    const hmac = hmacFromQuery ?? body?.hmac;
    if (!this.paymentService.verifyTransactionHmac(obj, hmac)) {
      // Deliberately still a 200: a bad signature means someone other than
      // Paymob sent this, and returning an error would only make a genuine
      // Paymob retry storm on a config mistake. It is logged and ignored.
      this.logger.warn('Rejected Paymob webhook with invalid HMAC');
      return { received: true };
    }

    await this.processTransaction(obj, 'webhook');
    return { received: true };
  }

  // Browser redirect after the customer finishes in the iframe. Treated as a
  // convenience only — it is HMAC-verified and processed (so a fast return
  // beats a slow webhook), but the webhook above remains the source of truth
  // and either path is safe to run first thanks to idempotent confirmation.
  @Public()
  @Get('return')
  @ApiExcludeEndpoint()
  async handleReturn(@Query() query: Record<string, any>, @Res() res: Response) {
    const obj = this.paymentService.buildObjFromFlatQuery(query);
    const verified = this.paymentService.verifyTransactionHmac(obj, query.hmac);

    let reference: string | null = null;
    let outcome: 'success' | 'failed' = 'failed';

    if (verified) {
      const result = await this.processTransaction(obj, 'redirect');
      reference = result.reference;
      outcome = result.paid ? 'success' : 'failed';
    } else {
      this.logger.warn('Rejected Paymob redirect with invalid HMAC');
    }

    const target = new URL('/join/result', this.configService.frontendUrl);
    target.searchParams.set('status', outcome);
    if (reference) {
      target.searchParams.set('invoice', reference);
    }
    return res.redirect(target.toString());
  }

  // Every Paymob order id this controller is ever handed belongs to a gym
  // invoice — a card payment against a membership plan or a renewal. There
  // used to be a second owner here (a storefront order) and this method
  // routed between the two by checking which one existed; now there is only
  // the one, and this is that lookup and confirmation, kept as its own method
  // because handleWebhook and handleReturn both need it.
  private async processTransaction(
    obj: Record<string, any>,
    source: 'webhook' | 'redirect'
  ): Promise<{ reference: string | null; paid: boolean }> {
    const txn = this.paymentService.normalizeTransaction(obj);
    if (!txn) {
      this.logger.warn(`Paymob ${source} callback missing transaction/order id`);
      return { reference: null, paid: false };
    }

    // Neither a success nor a failure yet — an unpaid wallet request, say.
    // Leave everything alone and wait for the final callback rather than
    // failing a payment that may still complete.
    if (txn.pending && !txn.success) {
      this.logger.log(`Paymob ${source}: transaction ${txn.transactionId} still pending`);
      return { reference: null, paid: false };
    }

    if (txn.success) {
      const result = await this.invoicesService.confirmCardPayment({
        paymobOrderId: txn.paymobOrderId,
        transactionId: txn.transactionId,
        amountCents: txn.amountCents,
      });
      return {
        reference: await this.invoicesService.findInvoiceNumberByPaymobId(txn.paymobOrderId),
        paid: result === 'confirmed' || result === 'already_confirmed',
      };
    }

    await this.invoicesService.failCardPayment(txn.paymobOrderId, txn.transactionId);
    return {
      reference: await this.invoicesService.findInvoiceNumberByPaymobId(txn.paymobOrderId),
      paid: false,
    };
  }
}
