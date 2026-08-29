import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ClassTypesService } from './class-types.service';
import { ClassTypesController } from './class-types.controller';
import { ClassType, ClassTypeSchema } from './schemas/class-type.schema';

@Module({
  imports: [MongooseModule.forFeature([{ name: ClassType.name, schema: ClassTypeSchema }])],
  controllers: [ClassTypesController],
  providers: [ClassTypesService],
  exports: [ClassTypesService, MongooseModule],
})
export class ClassTypesModule {}
