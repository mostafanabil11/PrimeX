import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { EmailService } from '@/auth/services/email.service';
import { ConfigService } from '@/config/config.service';

interface PtRequestedPayload {
  id: string;
  referenceCode: string | null;
  memberName: string;
  phone: string;
  trainerName: string;
  preferredStartsAt: Date;
  goal: string | null;
}

/**
 * Tells staff a coach has been asked for.
 *
 * Only the staff notification, and no confirmation to the member — unlike the
 * enquiry listener, which sends both. The member is about to be handed a
 * prefilled WhatsApp message naming the coach, the date and the reference,
 * which is a better receipt than an email and arrives on the surface they are
 * already looking at. A second confirmation by mail would be noise.
 *
 * Written as a listener rather than awaited in the service so a mail outage
 * cannot turn a captured request into a failed form submission. The record
 * exists before this runs.
 */
@Injectable()
export class PersonalTrainingListener {
  private readonly logger = new Logger(PersonalTrainingListener.name);

  constructor(
    private emailService: EmailService,
    private configService: ConfigService
  ) {}

  @OnEvent('pt.requested')
  async handlePtRequested(payload: PtRequestedPayload) {
    const staffAddress = this.configService.mailFromAddress;

    if (!staffAddress) {
      // Worth a warning rather than silence: the form captured the request,
      // but nobody is being told until someone opens the admin screen.
      this.logger.warn(
        `PT request ${payload.id} captured, but no MAIL_FROM_ADDRESS is set so no staff notification was sent`
      );
      return;
    }

    const starts = payload.preferredStartsAt.toLocaleDateString('en-GB', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    // Plain rows rather than prose. This is read on a phone at a front desk by
    // somebody deciding whether to pick up the thread now or after the class
    // that is about to start.
    const rows: Array<[string, string]> = [
      ['Member', payload.memberName],
      ['Phone', payload.phone],
      ['Coach', payload.trainerName],
      ['Wants to start', starts],
    ];
    if (payload.goal) rows.push(['Goal', payload.goal]);
    if (payload.referenceCode) rows.push(['Reference', payload.referenceCode]);

    const html = `
      <div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#111">
        <h2 style="margin:0 0 4px;font-size:18px">Personal training request</h2>
        <p style="margin:0 0 16px;color:#555;font-size:14px">
          ${payload.memberName} has asked to train with ${payload.trainerName}.
        </p>
        <table style="border-collapse:collapse;font-size:14px">
          ${rows
            .map(
              ([label, value]) => `
            <tr>
              <td style="padding:6px 16px 6px 0;color:#666;white-space:nowrap">${label}</td>
              <td style="padding:6px 0;font-weight:600">${escapeHtml(value)}</td>
            </tr>`
            )
            .join('')}
        </table>
        <p style="margin:16px 0 0;color:#555;font-size:13px">
          No invoice has been raised — personal training is priced in the conversation.
        </p>
      </div>`;

    await this.emailService.send(
      staffAddress,
      `PT request — ${payload.memberName} with ${payload.trainerName}`,
      html,
      'Personal training notification'
    );
  }
}

/** Member-supplied strings land in this template, so they are escaped. */
function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
