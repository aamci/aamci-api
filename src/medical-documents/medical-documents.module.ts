import { Module } from '@nestjs/common';
import { MulterModule } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { MedicalDocumentsController } from './medical-documents.controller';
import { MedicalDocumentsService } from './medical-documents.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  imports: [
    MulterModule.register({
      storage: memoryStorage(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50 MB max
    }),
  ],
  controllers: [MedicalDocumentsController],
  providers: [MedicalDocumentsService, PrismaService],
  exports: [MedicalDocumentsService],
})
export class MedicalDocumentsModule {}
