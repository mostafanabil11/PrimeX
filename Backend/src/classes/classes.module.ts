import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassesService } from './classes.service';
import { ClassesController } from './classes.controller';
import { ClassesScheduler } from './classes.scheduler';
import {
  RecurrenceRule,
  RecurrenceRuleSchema,
  ClassSession,
  ClassSessionSchema,
} from './schemas/class-session.schema';
import { ClassTypesModule } from '@/class-types/class-types.module';
import { BookingsModule } from '@/bookings/bookings.module';
import { SettingsModule } from '@/settings/settings.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: RecurrenceRule.name, schema: RecurrenceRuleSchema },
      { name: ClassSession.name, schema: ClassSessionSchema },
    ]),
    ClassTypesModule,
    BookingsModule,
    SettingsModule,
    ConfigModule,
  ],
  controllers: [ClassesController],
  providers: [ClassesService, ClassesScheduler],
  exports: [ClassesService, MongooseModule],
})
export class ClassesModule {}
