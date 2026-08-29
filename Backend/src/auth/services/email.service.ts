import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { ConfigService } from '@/config/config.service';

interface Message {
  to: string;
  subject: string;
  html: string;
  /** Prefixed to log lines so a missing email traces back to what caused it. */
  context?: string;
}

/**
 * Two ways out of the building, chosen by what is configured:
 *
 *   Brevo (HTTP)  — an ordinary HTTPS request, so hosts that block SMTP can't
 *                   block it. Render's free instances refuse outbound traffic
 *                   on ports 25, 465 and 587, which is why SMTP worked in
 *                   development and silently did nothing once deployed.
 *   SMTP (Gmail)  — kept for local development, where nothing is blocked and
 *                   an App Password is the quickest thing to have working.
 *
 * Neither configured means nothing is delivered, which is a legitimate state
 * for a checkout to run in — it just has to say so rather than pretend.
 */
type Transport = 'brevo' | 'smtp' | 'none';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transport: Transport;
  private smtpTransporter?: nodemailer.Transporter;

  constructor(private configService: ConfigService) {
    this.transport = this.selectTransport();
    this.announce();
  }

  private selectTransport(): Transport {
    if (this.configService.brevoApiKey) return 'brevo';
    if (this.configService.isSmtpConfigured) return 'smtp';
    return 'none';
  }

  private announce() {
    if (this.transport === 'brevo') {
      this.logger.log(
        `Email transport: Brevo HTTP API, sending as ${this.configService.mailFromAddress}`
      );
      return;
    }

    if (this.transport === 'smtp') {
      this.smtpTransporter = nodemailer.createTransport({
        // Spelled out rather than service:'gmail' so the port is visible in
        // the config: when a host blocks outbound mail, knowing which port was
        // tried is the difference between a diagnosable failure and a mystery.
        host: 'smtp.gmail.com',
        port: 465,
        secure: true,
        auth: {
          // Google prints App Passwords in four blocks for readability; the
          // spaces are presentation, not part of the secret.
          user: this.configService.get<string>('EMAIL_USER')?.trim(),
          pass: this.configService.get<string>('EMAIL_PASSWORD')?.replace(/\s+/g, ''),
        },
        // Without these nodemailer waits minutes on a blocked port, so the
        // failure surfaces long after the request that caused it.
        connectionTimeout: 10000,
        greetingTimeout: 10000,
        socketTimeout: 15000,
      });

      // Answers "can mail leave this host" at startup rather than when a
      // customer's confirmation quietly fails to arrive. Not awaited: email is
      // not worth delaying boot for.
      void this.smtpTransporter
        .verify()
        .then(() =>
          this.logger.log('Email transport: SMTP verified, order emails will be delivered')
        )
        .catch((err: Error) =>
          this.logger.error(
            `Email transport: SMTP verification FAILED, nothing will be delivered — ${err.message}. ` +
              'If this host blocks SMTP ports, set BREVO_API_KEY to send over HTTPS instead.'
          )
        );
      return;
    }

    this.logger.warn(
      'No email transport configured (set BREVO_API_KEY, or EMAIL_USER + EMAIL_PASSWORD) — ' +
        'order confirmations, OTPs and password resets will NOT be delivered.'
    );
  }

  /** True when messages actually leave the building. */
  get isConfigured(): boolean {
    return this.transport !== 'none';
  }

  /**
   * The one place a message is actually sent. Every send* method below is a
   * subject line and a template; this owns transport, logging and failure.
   *
   * Returns false rather than throwing: an order is already placed by the time
   * its confirmation goes out, and losing the email is a far smaller problem
   * than losing the order. Callers that genuinely depend on delivery — OTP,
   * password reset — check the return value and raise their own error.
   */
  private async deliver({ to, subject, html, context }: Message): Promise<boolean> {
    const label = context ? `${context}: ` : '';

    if (this.transport === 'none') {
      this.logger.warn(`${label}not sent to ${to} — no email transport configured`);
      return false;
    }

    try {
      if (this.transport === 'brevo') {
        await this.deliverViaBrevo({ to, subject, html });
      } else {
        await this.smtpTransporter!.sendMail({
          from: `"${this.configService.mailFromName}" <${this.configService.mailFromAddress}>`,
          to,
          subject,
          html,
        });
      }

      this.logger.log(`${label}email sent to ${to}`);
      return true;
    } catch (error) {
      this.logger.error(`${label}email to ${to} FAILED — ${(error as Error).message}`);
      return false;
    }
  }

  private async deliverViaBrevo({ to, subject, html }: Omit<Message, 'context'>): Promise<void> {
    // Plain fetch rather than the SDK: one endpoint, one header, and a
    // dependency that ships its own HTTP stack isn't worth carrying for it.
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        accept: 'application/json',
        'api-key': this.configService.brevoApiKey!,
      },
      body: JSON.stringify({
        sender: {
          email: this.configService.mailFromAddress,
          name: this.configService.mailFromName,
        },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      // Brevo is a dependency of checkout's happy path only in the sense that
      // it runs after the order exists; still, an unbounded wait would pin a
      // request handler open indefinitely.
      signal: AbortSignal.timeout(15000),
    });

    if (!response.ok) {
      // Brevo returns a JSON body explaining the refusal — an unverified
      // sender address is the usual one, and worth surfacing verbatim rather
      // than reporting a bare status code.
      const detail = await response.text().catch(() => '');
      throw new Error(
        `Brevo responded ${response.status}${detail ? ` — ${detail.slice(0, 300)}` : ''}`
      );
    }
  }

  // --- Account ---

  /**
   * For mail that has no dedicated method — enquiry notifications and the like.
   * Returns whether it went, and never throws: callers here are event
   * listeners, and a mail outage must not take down whatever triggered them.
   */
  async send(to: string, subject: string, html: string, context: string): Promise<boolean> {
    return this.deliver({ to, subject, html, context });
  }

  async sendOtpEmail(
    email: string,
    userName: string,
    otp: string,
    htmlTemplate: string
  ): Promise<boolean> {
    const sent = await this.deliver({
      to: email,
      subject: 'Email Verification - OTP',
      html: htmlTemplate,
      context: 'Verification OTP',
    });
    // Signing up is pointless if the code never arrives, so this one does fail
    // loudly — unlike the order mails, which must never break a placed order.
    if (!sent) {
      throw new Error('Failed to send verification email');
    }
    return true;
  }

  async sendWelcomeEmail(email: string, userName: string, htmlTemplate: string): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: `Welcome to ${this.configService.brandName}`,
      html: htmlTemplate,
      context: 'Welcome',
    });
  }

  async sendPasswordResetEmail(
    email: string,
    userName: string,
    htmlTemplate: string
  ): Promise<boolean> {
    const sent = await this.deliver({
      to: email,
      subject: 'Password Reset Request',
      html: htmlTemplate,
      context: 'Password reset',
    });
    if (!sent) {
      throw new Error('Failed to send password reset email');
    }
    return true;
  }

  // --- Orders ---

  async sendOrderConfirmationEmail(
    email: string,
    userName: string,
    orderNumber: string,
    htmlTemplate: string
  ): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: `Order Confirmed — ${orderNumber}`,
      html: htmlTemplate,
      context: `Order ${orderNumber} confirmation`,
    });
  }

  async sendOrderShippedEmail(
    email: string,
    orderNumber: string,
    htmlTemplate: string
  ): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: `Your Order Has Shipped — ${orderNumber}`,
      html: htmlTemplate,
      context: `Order ${orderNumber} shipped`,
    });
  }

  async sendOrderDeliveredEmail(
    email: string,
    orderNumber: string,
    htmlTemplate: string
  ): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: `Delivered — ${orderNumber}`,
      html: htmlTemplate,
      context: `Order ${orderNumber} delivered`,
    });
  }

  async sendOrderRefundedEmail(
    email: string,
    orderNumber: string,
    htmlTemplate: string
  ): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: `Refund Processed — ${orderNumber}`,
      html: htmlTemplate,
      context: `Order ${orderNumber} refund`,
    });
  }

  async sendOrderCancelledEmail(
    email: string,
    orderNumber: string,
    htmlTemplate: string
  ): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: `Order Cancelled — ${orderNumber}`,
      html: htmlTemplate,
      context: `Order ${orderNumber} cancellation`,
    });
  }

  // --- Marketing ---

  async sendBackInStockEmail(
    email: string,
    productName: string,
    htmlTemplate: string
  ): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: `Back in Stock — ${productName}`,
      html: htmlTemplate,
      context: `Back in stock (${productName})`,
    });
  }

  async sendAbandonedCartEmail(email: string, htmlTemplate: string): Promise<boolean> {
    return this.deliver({
      to: email,
      subject: 'You left something in your bag',
      html: htmlTemplate,
      context: 'Abandoned cart',
    });
  }
}
