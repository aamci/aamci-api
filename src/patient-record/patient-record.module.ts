import { Module } from '@nestjs/common';
import { PatientRecordController } from './patient-record.controller';
import { PatientRecordService } from './patient-record.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [PatientRecordController],
  providers: [PatientRecordService, PrismaService],
  exports: [PatientRecordService],
})
export class PatientRecordModule {}
