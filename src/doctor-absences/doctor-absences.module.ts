import { Module } from '@nestjs/common';
import { DoctorAbsencesController } from './doctor-absences.controller';
import { DoctorAbsencesService } from './doctor-absences.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [DoctorAbsencesController],
  providers: [DoctorAbsencesService, PrismaService],
  exports: [DoctorAbsencesService],
})
export class DoctorAbsencesModule {}
