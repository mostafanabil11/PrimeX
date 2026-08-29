import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { createHash } from 'crypto';
import { CtaClick, CtaClickDocument } from './schemas/cta-click.schema';
import { CtaClickDto } from './dto';

// Obvious automation, dropped before it reaches the collection. Not a security
// measure — anything determined will get through — just enough that the funnel
// numbers are about people. Cheap substring test on a lowercased UA.
const BOT_MARKERS = ['bot', 'crawler', 'spider', 'headless', 'preview', 'monitor', 'curl', 'wget'];

@Injectable()
export class FunnelService {
  private readonly logger = new Logger(FunnelService.name);

  constructor(@InjectModel(CtaClick.name) private ctaClickModel: Model<CtaClickDocument>) {}

  /**
   * Record a CTA click, or quietly decline to.
   *
   * Never throws and never reports failure: the caller is a sendBeacon whose
   * result no one can observe, and the click is telemetry. Losing one is
   * immaterial; breaking the member's journey to WhatsApp over one is not.
   */
  async recordClick(dto: CtaClickDto, userAgent: string | undefined): Promise<void> {
    try {
      if (this.looksLikeBot(userAgent)) return;

      // Hour buckets: one person deciding between plans clicks several times
      // over a few minutes, and counting that as several people would overstate
      // the top of the funnel exactly where it matters most.
      const hourBucket = new Date().toISOString().slice(0, 13);
      const dedupeKey = createHash('sha256')
        .update(`${dto.clientId}|${dto.kind}|${dto.planId ?? ''}|${hourBucket}`)
        .digest('hex');

      await this.ctaClickModel.create({
        kind: dto.kind,
        plan: dto.planId ? new Types.ObjectId(dto.planId) : null,
        dedupeKey,
      });
    } catch (error) {
      // 11000 is the dedupe doing its job, and is the common case rather than
      // an error. Anything else is worth a line but still not worth failing.
      if ((error as { code?: number }).code !== 11000) {
        this.logger.warn(`Could not record CTA click: ${(error as Error).message}`);
      }
    }
  }

  private looksLikeBot(userAgent: string | undefined): boolean {
    if (!userAgent) return true;
    const ua = userAgent.toLowerCase();
    return BOT_MARKERS.some(marker => ua.includes(marker));
  }
}
