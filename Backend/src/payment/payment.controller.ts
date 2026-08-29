import { Controller, Get, Post, Body, Query, Res, HttpCode, Logger } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiExcludeEndpoint } from '@nestjs/swagger';
import { SkipThrottle } from '@nestjs/throttler';
import { Response } from 'express';

import { PaymentService } from './payment.service';
import { OrdersService } from '@/orders/orders.service';
import { InvoicesService } from '@/invoices/invoices.service';
import { ConfigService } from '@/config/config.service';
import { Public } from '@/auth/decorators/public.decorator';
import { Feature } from '@/common/decorators/feature.decorator';

@ApiTags('Payments')
// With both flags off there is nothing legitimate for Paymob to call back
// about — no invoice, no order could have been created to begin with.
@Feature('membershipSales', 'shop')
@Controller('payments/paymob')
// Paymob calls this as often as it needs to (including retries on non-2xx);
// throttling it would cause dropped payment confirmations.
@SkipThrottle()
export class PaymentController {
  private readonly logger = new Logger(PaymentController.name);

  constructor(
    private paymentService: PaymentService,
    private ordersService: OrdersService,
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
    let kind: 'invoice' | 'order' | null = null;
    let outcome: 'success' | 'failed' = 'failed';

    if (verified) {
      const result = await this.processTransaction(obj, 'redirect');
      reference = result.reference;
      kind = result.kind;
      outcome = result.paid ? 'success' : 'failed';
    } else {
      this.logger.warn('Rejected Paymob redirect with invalid HMAC');
    }

    // A membership payment lands on the join result page; a storefront order
    // keeps its own. Defaulting to the join page is right while the shop is
    // switched off — a callback with no reference is far more likely to be a
    // member than a shopper.
    const path = kind === 'order' ? '/checkout/result' : '/join/result';
    const target = new URL(path, this.configService.frontendUrl);
    target.searchParams.set('status', outcome);
    if (reference) {
      target.searchParams.set(kind === 'order' ? 'order' : 'invoice', reference);
    }
    return res.redirect(target.toString());
  }

  // A Paymob order id belongs either to a gym invoice or to a storefront
  // order, and this endpoint is the one thing both halves share. It routes on
  // ownership rather than guessing: invoices are asked first because the shop
  // is switched off, and orders remain the fallback so turning it back on
  // needs no change here.
  private async processTransaction(obj: Record<string, any>, source: 'webhook' | 'redirect') {
    const txn = this.paymentService.normalizeTransaction(obj);
    if (!txn) {
      this.logger.warn(`Paymob ${source} callback missing transaction/order id`);
      return { reference: null, paid: false, kind: null as 'invoice' | 'order' | null };
    }

    // Neither a success nor a failure yet — an unpaid wallet request, say.
    // Leave everything alone and wait for the final callback rather than
    // failing a payment that may still complete.
    if (txn.pending && !txn.success) {
      this.logger.log(`Paymob ${source}: transaction ${txn.transactionId} still pending`);
      return { reference: null, paid: false, kind: null as 'invoice' | 'order' | null };
    }

    const isInvoice = await this.invoicesService.existsForPaymobOrder(txn.paymobOrderId);

    if (isInvoice) {
      if (txn.success) {
        const result = await this.invoicesService.confirmCardPayment({
          paymobOrderId: txn.paymobOrderId,
          transactionId: txn.transactionId,
          amountCents: txn.amountCents,
        });
        return {
          reference: await this.invoicesService.findInvoiceNumberByPaymobId(txn.paymobOrderId),
          paid: result === 'confirmed' || result === 'already_confirmed',
          kind: 'invoice' as const,
        };
      }

      await this.invoicesService.failCardPayment(txn.paymobOrderId, txn.transactionId);
      return {
        reference: await this.invoicesService.findInvoiceNumberByPaymobId(txn.paymobOrderId),
        paid: false,
        kind: 'invoice' as const,
      };
    }

    if (txn.success) {
      const result = await this.ordersService.confirmCardPayment({
        paymobOrderId: txn.paymobOrderId,
        transactionId: txn.transactionId,
        amountCents: txn.amountCents,
      });
      const paid = result === 'confirmed' || result === 'already_confirmed';
      return {
        reference: await this.lookupOrderNumber(txn.paymobOrderId),
        paid,
        kind: 'order' as const,
      };
    }

    await this.ordersService.failCardPayment(txn.paymobOrderId, txn.transactionId);
    return {
      reference: await this.lookupOrderNumber(txn.paymobOrderId),
      paid: false,
      kind: 'order' as const,
    };
  }

  private async lookupOrderNumber(paymobOrderId: string): Promise<string | null> {
    return this.ordersService.findOrderNumberByPaymobId(paymobOrderId);
  }
}
