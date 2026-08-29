// The brand shown in every email. EmailUtils is a static class with no
// injection point, so it reads the environment directly — the same
// BRAND_NAME that ConfigService.brandName resolves, kept in step with it.
const BRAND = process.env.BRAND_NAME?.trim() || 'PrimeX';

interface OrderConfirmationLine {
  name: string;
  color: string;
  size: string;
  quantity: number;
  lineTotal: number;
}

interface OrderConfirmationData {
  orderNumber: string;
  items: OrderConfirmationLine[];
  subtotal: number;
  shippingCost: number;
  discountAmount: number;
  total: number;
  currency: string;
  shippingAddress: {
    firstName: string;
    lastName: string;
    addressLine: string;
    city: string;
    governorate: string;
  };
}

export class EmailUtils {
  private static formatMoney(minorUnits: number, currency: string): string {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      maximumFractionDigits: 0,
    }).format(minorUnits / 100);
  }

  static generateOrderConfirmationEmailTemplate(
    userName: string,
    order: OrderConfirmationData
  ): string {
    const rows = order.items
      .map(
        item => `
              <tr>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee;">
                  <strong>${item.name}</strong><br>
                  <span style="color: #777; font-size: 13px;">${item.color} · Size ${item.size} · Qty ${item.quantity}</span>
                </td>
                <td style="padding: 12px 0; border-bottom: 1px solid #eee; text-align: right; white-space: nowrap;">
                  ${this.formatMoney(item.lineTotal, order.currency)}
                </td>
              </tr>`
      )
      .join('');

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { text-align: center; color: #333; margin-bottom: 20px; }
            .content { color: #666; line-height: 1.6; }
            table { width: 100%; border-collapse: collapse; }
            .totals td { padding: 6px 0; }
            .totals .label { color: #777; }
            .totals .grand-total { font-weight: bold; color: #333; font-size: 16px; border-top: 2px solid #333; padding-top: 10px; }
            .address { background-color: #f9f9f9; padding: 16px; border-radius: 5px; margin-top: 20px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Thank You for Your Order</h1>
            </div>
            <div class="content">
              <p>Hi ${userName},</p>
              <p>We've received your order <strong>${order.orderNumber}</strong> and it's being prepared for shipment.</p>

              <table>${rows}</table>

              <table class="totals">
                <tr><td class="label">Subtotal</td><td style="text-align: right;">${this.formatMoney(order.subtotal, order.currency)}</td></tr>
                <tr><td class="label">Shipping</td><td style="text-align: right;">${order.shippingCost === 0 ? 'Free' : this.formatMoney(order.shippingCost, order.currency)}</td></tr>
                ${order.discountAmount > 0 ? `<tr><td class="label">Discount</td><td style="text-align: right;">-${this.formatMoney(order.discountAmount, order.currency)}</td></tr>` : ''}
                <tr class="grand-total"><td>Total</td><td style="text-align: right;">${this.formatMoney(order.total, order.currency)}</td></tr>
              </table>

              <div class="address">
                <strong>Shipping to:</strong><br>
                ${order.shippingAddress.firstName} ${order.shippingAddress.lastName}<br>
                ${order.shippingAddress.addressLine}<br>
                ${order.shippingAddress.city}, ${order.shippingAddress.governorate}
              </div>

              <p style="margin-top: 20px;">You'll get another email once your order ships.</p>
              <p>Thank you,<br><strong>${BRAND} Team</strong></p>
            </div>
            <div class="footer">
              <p>&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p>
            </div>
          </div>
        </body>
      </html>
    `;
  }

  private static wrap(title: string, bodyHtml: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; background-color: #f4f4f4; }
            .container { max-width: 600px; margin: 0 auto; background-color: white; padding: 20px; border-radius: 8px; }
            .header { text-align: center; color: #333; margin-bottom: 20px; }
            .content { color: #666; line-height: 1.6; }
            .tracking-box { background-color: #f0f0f0; padding: 16px; border-radius: 5px; margin: 20px 0; text-align: center; }
            .tracking-code { font-size: 20px; font-weight: bold; color: #333; letter-spacing: 1px; }
            .footer { text-align: center; color: #999; font-size: 12px; margin-top: 20px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header"><h1>${title}</h1></div>
            <div class="content">${bodyHtml}</div>
            <div class="footer"><p>&copy; ${new Date().getFullYear()} ${BRAND}. All rights reserved.</p></div>
          </div>
        </body>
      </html>
    `;
  }

  // --- Membership ---

  private static formatDate(d: Date): string {
    return d.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    });
  }

  static generateMembershipWelcomeTemplate(
    userName: string,
    planName: string,
    startsAt: Date,
    endsAt: Date,
    memberUrl: string
  ): string {
    return this.wrap(
      `Welcome to ${BRAND}`,
      `
        <p>Hi ${userName},</p>
        <p>Your <strong>${planName}</strong> membership is active.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 12px 6px 0;color:#666;">Starts</td><td style="padding:6px 0;"><strong>${this.formatDate(startsAt)}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666;">Runs until</td><td style="padding:6px 0;"><strong>${this.formatDate(endsAt)}</strong></td></tr>
        </table>
        <p>Bring photo ID to your first visit and the front desk will get you set up.</p>
        <p><a href="${memberUrl}">View your membership</a></p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateInvoiceReceiptTemplate(
    userName: string,
    invoiceNumber: string,
    memberUrl: string
  ): string {
    return this.wrap(
      'Your Receipt',
      `
        <p>Hi ${userName},</p>
        <p>Payment received. Your receipt reference is <strong>${invoiceNumber}</strong>.</p>
        <p><a href="${memberUrl}">View and print it</a> from your account at any time.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateExpiryReminderTemplate(
    userName: string,
    planName: string,
    endsAt: Date,
    daysLeft: number,
    renewUrl: string
  ): string {
    const when = daysLeft === 1 ? 'tomorrow' : daysLeft === 0 ? 'today' : `in ${daysLeft} days`;

    return this.wrap(
      'Your Membership Is Ending',
      `
        <p>Hi ${userName},</p>
        <p>Your <strong>${planName}</strong> membership ends ${when}, on ${this.formatDate(endsAt)}.</p>
        <p>Nothing is charged automatically — renewing is one click when you are ready.</p>
        <p><a href="${renewUrl}">Renew your membership</a></p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateLapsedNudgeTemplate(userName: string, planName: string, renewUrl: string): string {
    return this.wrap(
      'We Have Not Seen You',
      `
        <p>Hi ${userName},</p>
        <p>Your <strong>${planName}</strong> membership ended a week ago and we would rather you were still training.</p>
        <p>Your place is here whenever you want it back.</p>
        <p><a href="${renewUrl}">Pick up where you left off</a></p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateMembershipCancelledTemplate(userName: string, planName: string): string {
    return this.wrap(
      'Membership Cancelled',
      `
        <p>Hi ${userName},</p>
        <p>Your <strong>${planName}</strong> membership has been cancelled, as requested.</p>
        <p>If this was not you, tell us straight away and we will sort it out.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  // --- Class bookings ---
  //
  // Every one of these takes the session's wall-clock time as a preformatted
  // string rather than a Date. The gym's local time is the only time a member
  // cares about, and it is resolved once by the caller (which has the timezone
  // helpers) instead of being re-derived, differently, in four templates.

  static generateBookingConfirmedTemplate(
    userName: string,
    className: string,
    when: string,
    branchName: string,
    creditsRemaining: number | null,
    myClassesUrl: string
  ): string {
    return this.wrap(
      'Class Booked',
      `
        <p>Hi ${userName},</p>
        <p>You are booked into <strong>${className}</strong>.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 12px 6px 0;color:#666;">When</td><td style="padding:6px 0;"><strong>${when}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666;">Where</td><td style="padding:6px 0;"><strong>${branchName}</strong></td></tr>
          ${
            creditsRemaining === null
              ? ''
              : `<tr><td style="padding:6px 12px 6px 0;color:#666;">Credits left</td><td style="padding:6px 0;"><strong>${creditsRemaining}</strong></td></tr>`
          }
        </table>
        <p>Cannot make it? Cancel from your account and, if you are inside the window, your credit comes back.</p>
        <p><a href="${myClassesUrl}">Manage your classes</a></p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateBookingCancelledTemplate(
    userName: string,
    className: string,
    when: string,
    creditReturned: boolean,
    scheduleUrl: string
  ): string {
    return this.wrap(
      'Booking Cancelled',
      `
        <p>Hi ${userName},</p>
        <p>Your place in <strong>${className}</strong> on ${when} has been cancelled.</p>
        <p>${
          creditReturned
            ? 'Your class credit has been returned.'
            : 'This was inside the cancellation window, so the class still counts.'
        }</p>
        <p><a href="${scheduleUrl}">Book something else</a></p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  // Sent when the gym cancels, not the member — so it apologises, explains,
  // and confirms the credit is back without being asked.
  static generateSessionCancelledTemplate(
    userName: string,
    className: string,
    when: string,
    reason: string | null,
    scheduleUrl: string
  ): string {
    return this.wrap(
      'Class Cancelled',
      `
        <p>Hi ${userName},</p>
        <p>We have had to cancel <strong>${className}</strong> on ${when}. Sorry for the short notice.</p>
        ${reason ? `<p>${reason}</p>` : ''}
        <p>You were not charged, and any class credit you used has been returned.</p>
        <p><a href="${scheduleUrl}">Find another session</a></p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateClassReminderTemplate(
    userName: string,
    className: string,
    when: string,
    branchName: string,
    myClassesUrl: string
  ): string {
    return this.wrap(
      'See You Tomorrow',
      `
        <p>Hi ${userName},</p>
        <p>A reminder that you are booked into <strong>${className}</strong> tomorrow.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">
          <tr><td style="padding:6px 12px 6px 0;color:#666;">When</td><td style="padding:6px 0;"><strong>${when}</strong></td></tr>
          <tr><td style="padding:6px 12px 6px 0;color:#666;">Where</td><td style="padding:6px 0;"><strong>${branchName}</strong></td></tr>
        </table>
        <p>If you cannot make it, cancel from your account so someone else can take the place.</p>
        <p><a href="${myClassesUrl}">Manage your classes</a></p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  // --- Enquiries ---

  static generateEnquiryConfirmationTemplate(name: string, isTrial: boolean): string {
    return this.wrap(
      isTrial ? 'Your Free Session' : 'We Got Your Message',
      `
        <p>Hi ${name},</p>
        <p>
          ${
            isTrial
              ? 'Thanks for asking about a free session. One of the team will call you shortly to find a time that suits you.'
              : 'Thanks for getting in touch. One of the team will come back to you within one working day.'
          }
        </p>
        <p>Nothing is needed from you in the meantime.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  // Goes to staff, not to a customer, so it reads as a work item: everything
  // needed to make the call is in the body rather than behind a link.
  static generateEnquiryNotificationTemplate(enquiry: {
    type: string;
    name: string;
    phone: string;
    email?: string | null;
    goal?: string | null;
    message?: string | null;
  }): string {
    const rows = [
      ['Name', enquiry.name],
      ['Phone', enquiry.phone],
      ['Email', enquiry.email || '—'],
      ['Goal', enquiry.goal || '—'],
      ['Message', enquiry.message || '—'],
    ]
      .map(
        ([label, value]) =>
          `<tr><td style="padding:6px 12px 6px 0;color:#666;">${label}</td><td style="padding:6px 0;"><strong>${value}</strong></td></tr>`
      )
      .join('');

    return this.wrap(
      enquiry.type === 'trial' ? 'New Free Trial Request' : 'New Contact Message',
      `
        <p>A new ${enquiry.type === 'trial' ? 'trial request' : 'message'} came in.</p>
        <table style="width:100%;border-collapse:collapse;margin:16px 0;">${rows}</table>
        <p>It is in the admin inbox under Enquiries.</p>
      `
    );
  }

  static generateOrderShippedEmailTemplate(
    userName: string,
    orderNumber: string,
    trackingNumber: string | null
  ): string {
    return this.wrap(
      'Your Order Has Shipped',
      `
        <p>Hi ${userName},</p>
        <p>Good news — your order <strong>${orderNumber}</strong> is on its way.</p>
        ${
          trackingNumber
            ? `<div class="tracking-box"><p style="margin: 0 0 6px;">Tracking number</p><div class="tracking-code">${trackingNumber}</div></div>`
            : ''
        }
        <p>We'll let you know as soon as it's delivered.</p>
        <p>Thank you,<br><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateOrderDeliveredEmailTemplate(userName: string, orderNumber: string): string {
    return this.wrap(
      'Your Order Has Arrived',
      `
        <p>Hi ${userName},</p>
        <p>Your order <strong>${orderNumber}</strong> has been delivered. We hope you love it.</p>
        <p>Thank you,<br><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateOrderRefundedEmailTemplate(
    userName: string,
    orderNumber: string,
    total: number,
    currency: string
  ): string {
    return this.wrap(
      'Your Refund Has Been Processed',
      `
        <p>Hi ${userName},</p>
        <p>We've processed a refund of <strong>${this.formatMoney(total, currency)}</strong> for order <strong>${orderNumber}</strong>. It should appear on your original payment method within a few business days.</p>
        <p>If you have any questions, just reply to this email.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateOrderCancelledEmailTemplate(userName: string, orderNumber: string): string {
    return this.wrap(
      'Your Order Has Been Cancelled',
      `
        <p>Hi ${userName},</p>
        <p>Order <strong>${orderNumber}</strong> has been cancelled as requested. You have not been charged.</p>
        <p>If this wasn't you, please contact us right away.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateBackInStockEmailTemplate(
    productName: string,
    size: string,
    productUrl: string
  ): string {
    return this.wrap(
      "It's Back",
      `
        <p>Good news — <strong>${productName}</strong> (size ${size}) is back in stock.</p>
        <div class="tracking-box"><a href="${productUrl}" style="color:#111;text-decoration:underline;">Shop it now</a></div>
        <p>Stock is limited, so grab it before it sells out again.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateAbandonedCartEmailTemplate(
    userName: string,
    items: { name: string; color: string; size: string; image: string | null }[],
    cartUrl: string
  ): string {
    const rows = items
      .map(
        item => `
          <tr>
            <td style="padding: 10px 0; border-bottom: 1px solid #eee;">
              <strong>${item.name}</strong><br>
              <span style="color: #777; font-size: 13px;">${item.color} · Size ${item.size}</span>
            </td>
          </tr>`
      )
      .join('');

    return this.wrap(
      'You Left Something Behind',
      `
        <p>Hi ${userName},</p>
        <p>You still have items waiting in your bag:</p>
        <table style="width:100%;border-collapse:collapse;">${rows}</table>
        <div class="tracking-box"><a href="${cartUrl}" style="color:#111;text-decoration:underline;">Return to your bag</a></div>
        <p>Items aren't reserved, so act soon if something's low on stock.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generateOtpEmailTemplate(userName: string, otp: string): string {
    return this.wrap(
      'Verify Your Email',
      `
        <p>Hi ${userName},</p>
        <p>Use this code to finish setting up your ${BRAND} account:</p>
        <div style="background-color:#f0f0f0;padding:20px;text-align:center;border-radius:5px;margin:20px 0;">
          <div style="font-size:32px;font-weight:bold;color:#333;letter-spacing:5px;">${otp}</div>
        </div>
        <p>It expires in 10 minutes.</p>
        <p style="color:#e74c3c;font-size:12px;">If you did not ask for this code, you can ignore this email — nobody can use it without your inbox.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  /**
   * Sent the moment an email is verified — before any membership exists.
   *
   * Deliberately does not welcome them "as a member": at this point they
   * have an account and nothing else, and the membership welcome (with plan
   * and dates) is a separate email sent once a payment settles. Saying
   * "welcome to the gym" here would land twice and be wrong the first time.
   */
  static generateWelcomeEmailTemplate(userName: string): string {
    return this.wrap(
      `Welcome to ${BRAND}`,
      `
        <p>Hi ${userName},</p>
        <p>Your email is verified and your account is ready.</p>
        <p>Next step is choosing a membership — you can pay by card, or reserve online and pay cash at the front desk.</p>
        <p>Not sure which plan suits you? Come in and ask. We would rather point you at the right one than sell you the biggest.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }

  static generatePasswordResetEmailTemplate(userName: string, resetUrl: string): string {
    return this.wrap(
      'Reset Your Password',
      `
        <p>Hi ${userName},</p>
        <p>Someone asked to reset the password on your ${BRAND} account. If that was you, choose a new one here:</p>
        <div style="text-align:center;margin:24px 0;">
          <a href="${resetUrl}" style="display:inline-block;background-color:#111;color:#fff;text-decoration:none;padding:14px 28px;border-radius:4px;font-weight:bold;">Reset password</a>
        </div>
        <p>Or paste this into your browser:</p>
        <p style="word-break:break-all;font-size:12px;color:#666;">${resetUrl}</p>
        <p>The link expires in 1 hour.</p>
        <p style="color:#e74c3c;font-size:12px;">If this was not you, ignore this email — your password stays as it is until the link is used.</p>
        <p><strong>${BRAND} Team</strong></p>
      `
    );
  }
}
