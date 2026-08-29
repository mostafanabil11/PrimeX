import { Controller, Post, Body, Headers, HttpCode, HttpStatus } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { FunnelService } from './funnel.service';
import { CtaClickDto } from './dto';
import { Public } from '@/auth/decorators/public.decorator';

@ApiTags('Funnel')
@Controller('funnel')
export class FunnelController {
  constructor(private funnelService: FunnelService) {}

  /**
   * Records a click on a call-to-action.
   *
   * 204 always, whatever happened — including when the write was refused as a
   * duplicate or dropped as a bot. The browser sends this with sendBeacon
   * during navigation to WhatsApp, so nothing can read the response anyway,
   * and a status that varied would only tempt someone into depending on it.
   *
   * Twenty a minute is generous for a person and stingy for a script. Not
   * gated behind a feature flag: knowing how many people clicked through is
   * worth having whether or not reservations are switched on.
   */
  @Public()
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  @HttpCode(HttpStatus.NO_CONTENT)
  @Post('cta-click')
  @ApiOperation({ summary: 'Record an anonymous CTA click' })
  @ApiResponse({ status: 204, description: 'Recorded, or deliberately ignored' })
  async recordClick(@Body() dto: CtaClickDto, @Headers('user-agent') userAgent?: string) {
    await this.funnelService.recordClick(dto, userAgent);
  }
}
