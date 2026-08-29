import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '@/auth/services/email.service';
import { EmailUtils } from '@/auth/utils/email.utils';
import { ConfigService } from '@/config/config.service';

interface EnquiryCreatedPayload {
  id: string;
  type: string;
  name: string;
  phone: string;
  email: string | null;
  goal: string | null;
  message: string | null;
}

@Injectable()
export class EnquiriesListener {
  private readonly logger = new Logger(EnquiriesListener.name);

  constructor(
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  @OnEvent('enquiry.created')
  async handleEnquiryCreated(payload: EnquiryCreatedPayload) {
    // Staff first. A lead nobody hears about is the only genuinely costly
    // failure here — the customer's confirmation is a courtesy.
    const staffAddress = this.configService.mailFromAddress;
    if (staffAddress) {
      await this.emailService.send(
        staffAddress,
        payload.type === 'trial'
          ? `Free trial request — ${payload.name}`
          : `Contact message — ${payload.name}`,
        EmailUtils.generateEnquiryNotificationTemplate(payload),
        'Enquiry notification'
      );
    } else {
      // Worth a warning rather than silence: the form still captured the lead,
      // but nobody is being told about it until someone opens the admin inbox.
      this.logger.warn(
        `Enquiry ${payload.id} captured, but no MAIL_FROM_ADDRESS is set so no staff notification was sent`
      );
    }

    if (payload.email) {
      await this.emailService.send(
        payload.email,
        payload.type === 'trial'
          ? 'Your free session — we will be in touch'
          : 'We got your message',
        EmailUtils.generateEnquiryConfirmationTemplate(payload.name, payload.type === 'trial'),
        'Enquiry confirmation'
      );
    }

    this.logger.log(`Enquiry ${payload.id} (${payload.type}) notified`);
  }
}
