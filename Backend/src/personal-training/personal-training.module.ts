import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { PersonalTrainingService } from './personal-training.service';
import { PersonalTrainingController } from './personal-training.controller';
import { PtRequest, PtRequestSchema } from './schemas/pt-request.schema';
import { TrainersModule } from '@/trainers/trainers.module';
import { AuthModule } from '@/auth/auth.module';
import { ConfigModule } from '@/config/config.module';
import { PersonalTrainingListener } from './listeners/personal-training.listener';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: PtRequest.name, schema: PtRequestSchema }]),
    // For findActiveByIdOrFail — a request naming a coach who has left should
    // fail rather than create a record nobody can fulfil.
    TrainersModule,
    // For findOrCreateMemberByPhone. The same call the membership reservation
    // makes, so a person who reserves PT and later reserves a membership is one
    // member with one number, not two records to merge.
    AuthModule,
    // ConfigModule for the staff mail address; AuthModule already re-exports
    // EmailService, which is what the listener sends through.
    ConfigModule,
  ],
  controllers: [PersonalTrainingController],
  providers: [PersonalTrainingService, PersonalTrainingListener],
  exports: [PersonalTrainingService],
})
export class PersonalTrainingModule {}
