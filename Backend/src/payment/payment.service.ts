import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import * as crypto from 'crypto';
import { ConfigService } from '@/config/config.service';

// The 20 fields Paymob concatenates (in this exact order) to produce the
// transaction HMAC. Dotted paths are resolved into the nested `obj`.
// Order is defined by Paymob and must not be "tidied" or sorted.
const TRANSACTION_HMAC_FIELDS = [
  'amount_cents',
  'created_at',
  'currency',
  'error_occured',
  'has_parent_transaction',
  'id',
  'integration_id',
  'is_3d_secure',
  'is_auth',
  'is_capture',
  'is_refunded',
  'is_standalone_payment',
  'is_voided',
  'order.id',
  'owner',
  'pending',
  'source_data.pan',
  'source_data.sub_type',
  'source_data.type',
  'success',
] as const;

const PAYMOB_BASE = 'https://accept.paymob.com';

export interface PaymobBillingData {
  first_name: string;
  last_name: string;
  phone_number: string;
  email: string;
  street: string;
  city: string;
  state: string;
  country: string;
  postal_code: string;
  apartment: string;
  floor: string;
  building: string;
  shipping_method: string;
}

export interface PaymobLineItem {
  name: string;
  amount_cents: number;
  quantity: number;
  description?: string;
}

export interface PaymentSession {
  paymobOrderId: string;
  paymentKey: string;
  iframeUrl: string;
  expiresInSeconds: number;
}

export interface NormalizedTransaction {
  transactionId: string;
  paymobOrderId: string;
  amountCents: number;
  success: boolean;
  pending: boolean;
  currency: string;
}

// How long a generated payment key stays valid. Deliberately shorter than
// Paymob's 1-hour maximum: this is also how long the customer's stock
// reservation is held, and an abandoned checkout shouldn't sit on inventory
// for an hour. See OrdersService.releaseExpiredCardOrders.
const PAYMENT_WINDOW_SECONDS = 15 * 60;

@Injectable()
export class PaymentService {
  private readonly logger = new Logger(PaymentService.name);

  constructor(private configService: ConfigService) {}

  // Card payment is optional infrastructure — the store still works on COD
  // alone. Everything card-related checks this first so a missing key
  // surfaces as "card payment unavailable" rather than a 500 mid-checkout.
  isConfigured(): boolean {
    return Boolean(
      this.configService.paymobApiKey &&
      this.configService.paymobIntegrationId &&
      this.configService.paymobIframeId &&
      this.configService.paymobHmacSecret
    );
  }

  private async paymobFetch<T>(
    path: string,
    body: Record<string, unknown>,
    step: string
  ): Promise<T> {
    let response: Response;
    try {
      response = await fetch(`${PAYMOB_BASE}${path}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch (err) {
      // Network failure / timeout reaching Paymob at all.
      this.logger.error(`Paymob ${step} request failed: ${(err as Error).message}`);
      throw new ServiceUnavailableException(
        'Card payment is temporarily unavailable. Please try again.'
      );
    }

    const raw = await response.text();
    if (!response.ok) {
      // Paymob's error bodies can echo back request data — logged server-side
      // for debugging, never forwarded to the customer.
      this.logger.error(`Paymob ${step} returned ${response.status}: ${raw.slice(0, 500)}`);
      throw new ServiceUnavailableException(
        'Card payment is temporarily unavailable. Please try again.'
      );
    }

    try {
      return JSON.parse(raw) as T;
    } catch {
      this.logger.error(`Paymob ${step} returned non-JSON: ${raw.slice(0, 200)}`);
      throw new ServiceUnavailableException(
        'Card payment is temporarily unavailable. Please try again.'
      );
    }
  }

  private async authenticate(): Promise<string> {
    const data = await this.paymobFetch<{ token?: string }>(
      '/api/auth/tokens',
      { api_key: this.configService.paymobApiKey },
      'authentication'
    );
    if (!data.token) {
      this.logger.error('Paymob authentication succeeded but returned no token');
      throw new ServiceUnavailableException(
        'Card payment is temporarily unavailable. Please try again.'
      );
    }
    return data.token;
  }

  private async registerOrder(
    authToken: string,
    params: { amountCents: number; merchantOrderId: string; items: PaymobLineItem[] }
  ): Promise<string> {
    const data = await this.paymobFetch<{ id?: number | string }>(
      '/api/ecommerce/orders',
      {
        auth_token: authToken,
        delivery_needed: false,
        amount_cents: params.amountCents,
        currency: 'EGP',
        merchant_order_id: params.merchantOrderId,
        items: params.items,
      },
      'order registration'
    );
    if (data.id === undefined || data.id === null) {
      this.logger.error('Paymob order registration returned no id');
      throw new ServiceUnavailableException(
        'Card payment is temporarily unavailable. Please try again.'
      );
    }
    return String(data.id);
  }

  private async createPaymentKey(
    authToken: string,
    params: { paymobOrderId: string; amountCents: number; billingData: PaymobBillingData }
  ): Promise<string> {
    const data = await this.paymobFetch<{ token?: string }>(
      '/api/acceptance/payment_keys',
      {
        auth_token: authToken,
        amount_cents: params.amountCents,
        expiration: PAYMENT_WINDOW_SECONDS,
        order_id: params.paymobOrderId,
        billing_data: params.billingData,
        currency: 'EGP',
        integration_id: this.configService.paymobIntegrationId,
        lock_order_when_paid: true,
      },
      'payment key generation'
    );
    if (!data.token) {
      this.logger.error('Paymob payment key generation returned no token');
      throw new ServiceUnavailableException(
        'Card payment is temporarily unavailable. Please try again.'
      );
    }
    return data.token;
  }

  // One call for the whole legacy 3-step handshake (auth -> register -> key),
  // so callers never have to know the sequence or thread the auth token.
  async createPaymentSession(params: {
    amountCents: number;
    merchantOrderId: string;
    items: PaymobLineItem[];
    billingData: PaymobBillingData;
  }): Promise<PaymentSession> {
    const authToken = await this.authenticate();
    const paymobOrderId = await this.registerOrder(authToken, {
      amountCents: params.amountCents,
      merchantOrderId: params.merchantOrderId,
      items: params.items,
    });
    const paymentKey = await this.createPaymentKey(authToken, {
      paymobOrderId,
      amountCents: params.amountCents,
      billingData: params.billingData,
    });

    return {
      paymobOrderId,
      paymentKey,
      iframeUrl: `${PAYMOB_BASE}/api/acceptance/iframes/${this.configService.paymobIframeId}?payment_token=${paymentKey}`,
      expiresInSeconds: PAYMENT_WINDOW_SECONDS,
    };
  }

  private resolvePath(source: Record<string, any>, path: string): unknown {
    return path.split('.').reduce<any>((acc, key) => (acc == null ? undefined : acc[key]), source);
  }

  // Builds the exact string Paymob signed. Missing fields become '' rather
  // than being skipped: dropping a field silently shifts every following
  // value and guarantees a mismatch that looks like a forged request.
  private buildHmacPayload(obj: Record<string, any>): string {
    return TRANSACTION_HMAC_FIELDS.map(field => {
      const value = this.resolvePath(obj, field);
      if (value === undefined || value === null) return '';
      // JS String(true) is already 'true'/'false', which is the lowercase
      // form Paymob expects — unlike Python's str(True) -> 'True'.
      return String(value);
    }).join('');
  }

  verifyTransactionHmac(obj: Record<string, any>, receivedHmac: string | undefined): boolean {
    if (!receivedHmac) {
      this.logger.warn('Paymob callback arrived with no HMAC');
      return false;
    }

    const computed = crypto
      .createHmac('sha512', this.configService.paymobHmacSecret)
      .update(this.buildHmacPayload(obj))
      .digest('hex');

    const a = Buffer.from(computed, 'utf8');
    const b = Buffer.from(receivedHmac.toLowerCase(), 'utf8');
    // Length check first: timingSafeEqual throws on mismatched lengths.
    if (a.length !== b.length) {
      this.logger.warn('Paymob HMAC length mismatch — rejecting callback');
      return false;
    }
    const valid = crypto.timingSafeEqual(a, b);
    if (!valid) {
      this.logger.warn('Paymob HMAC mismatch — rejecting callback');
    }
    return valid;
  }

  // Paymob's server-to-server webhook nests the transaction under `obj`,
  // while the browser redirect callback arrives as flat query params. This
  // normalizes both into one shape so the rest of the code has a single path.
  normalizeTransaction(obj: Record<string, any>): NormalizedTransaction | null {
    const transactionId = obj?.id;
    const paymobOrderId = obj?.order?.id ?? obj?.order;
    if (transactionId === undefined || paymobOrderId === undefined) {
      return null;
    }

    const asBool = (v: unknown) => v === true || v === 'true';

    return {
      transactionId: String(transactionId),
      paymobOrderId: String(paymobOrderId),
      amountCents: Number(obj.amount_cents),
      success: asBool(obj.success),
      pending: asBool(obj.pending),
      currency: String(obj.currency ?? 'EGP'),
    };
  }

  // Rebuilds the nested `obj` shape the HMAC is computed over from the flat
  // query params of a browser redirect callback.
  buildObjFromFlatQuery(query: Record<string, any>): Record<string, any> {
    const obj: Record<string, any> = { ...query };
    obj.order = { id: query['order'] };
    obj.source_data = {
      pan: query['source_data.pan'],
      sub_type: query['source_data.sub_type'],
      type: query['source_data.type'],
    };
    return obj;
  }
}
