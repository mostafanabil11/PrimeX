import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EnquiriesService } from './enquiries.service';
import { EnquiriesController } from './enquiries.controller';
import { EnquiriesListener } from './listeners/enquiries.listener';
import { Enquiry, EnquirySchema } from './schemas/enquiry.schema';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@/config/config.module';

@Module({
  // AuthModule for EmailService and ConfigModule for the sender address —
  // both are what the listener needs to notify staff.
  imports: [
    MongooseModule.forFeature([{ name: Enquiry.name, schema: EnquirySchema }]),
    AuthModule,
    ConfigModule,
  ],
  controllers: [EnquiriesController],
  providers: [EnquiriesService, EnquiriesListener],
  exports: [EnquiriesService],
})
export class EnquiriesModule {}
