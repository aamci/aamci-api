import { Module } from '@nestjs/common';
import { MedicalNotesController } from './medical-notes.controller';
import { MedicalNotesService } from './medical-notes.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [MedicalNotesController],
  providers: [MedicalNotesService, PrismaService],
  exports: [MedicalNotesService],
})
export class MedicalNotesModule {}
