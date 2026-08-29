import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { TrainersService } from './trainers.service';
import { TrainersController } from './trainers.controller';
import { Trainer, TrainerSchema } from './schemas/trainer.schema';
import { BranchesModule } from '@/branches/branches.module';

@Module({
  // BranchesModule re-exports MongooseModule, which is what makes the Branch
  // model injectable here — needed to check that a trainer's branch ids are
  // real before storing them.
  imports: [
    MongooseModule.forFeature([{ name: Trainer.name, schema: TrainerSchema }]),
    BranchesModule,
  ],
  controllers: [TrainersController],
  providers: [TrainersService],
  exports: [TrainersService, MongooseModule],
})
export class TrainersModule {}
