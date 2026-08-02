import { Module } from '@nestjs/common';
import { QuestionnairesController } from './questionnaires.controller';
import { QuestionnairesService } from './questionnaires.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [QuestionnairesController],
  providers: [QuestionnairesService, PrismaService],
  exports: [QuestionnairesService],
})
export class QuestionnairesModule {}
