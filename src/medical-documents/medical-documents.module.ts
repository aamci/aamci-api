import { Module } from '@nestjs/common';
import { MedicalDocumentsController } from './medical-documents.controller';
import { MedicalDocumentsService } from './medical-documents.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [MedicalDocumentsController],
  providers: [MedicalDocumentsService, PrismaService],
  exports: [MedicalDocumentsService],
})
export class MedicalDocumentsModule {}
