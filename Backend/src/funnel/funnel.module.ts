import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { FunnelController } from './funnel.controller';
import { FunnelService } from './funnel.service';
import { CtaClick, CtaClickSchema } from './schemas/cta-click.schema';

/**
 * Anonymous top-of-funnel measurement: how many people clicked a CTA, so the
 * reservations that follow have a denominator.
 *
 * AdminModule reads the same collection directly for the funnel report rather
 * than importing this module — the established pattern there for
 * aggregation-for-a-screen, and it keeps this module free of a dependency on
 * the admin side.
 */
@Module({
  imports: [MongooseModule.forFeature([{ name: CtaClick.name, schema: CtaClickSchema }])],
  controllers: [FunnelController],
  providers: [FunnelService],
})
export class FunnelModule {}
