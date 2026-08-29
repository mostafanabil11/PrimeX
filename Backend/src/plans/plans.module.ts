import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PlansService } from './plans.service';
import { PlansController } from './plans.controller';
import { Plan, PlanSchema } from './schemas/plan.schema';
import { OffersModule } from '@/offers/offers.module';

@Module({
  imports: [MongooseModule.forFeature([{ name: Plan.name, schema: PlanSchema }]), OffersModule],
  controllers: [PlansController],
  providers: [PlansService],
  exports: [PlansService, MongooseModule],
})
export class PlansModule {}
