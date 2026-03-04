import { Module } from '@nestjs/common';
import { CorrespondencesController } from './correspondences.controller';
import { CorrespondencesService } from './correspondences.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [CorrespondencesController],
  providers: [CorrespondencesService, PrismaService],
  exports: [CorrespondencesService],
})
export class CorrespondencesModule {}
