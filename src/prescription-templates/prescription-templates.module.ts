import { Module } from '@nestjs/common';
import { PrescriptionTemplatesController } from './prescription-templates.controller';
import { PrescriptionTemplatesService } from './prescription-templates.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [PrescriptionTemplatesController],
  providers: [PrescriptionTemplatesService, PrismaService],
  exports: [PrescriptionTemplatesService],
})
export class PrescriptionTemplatesModule {}
