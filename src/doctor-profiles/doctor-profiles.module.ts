import { Module } from '@nestjs/common';
import { DoctorProfilesService } from './doctor-profiles.service';
import { DoctorProfilesController } from './doctor-profiles.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  providers: [DoctorProfilesService, PrismaService],
  controllers: [DoctorProfilesController],
  exports: [DoctorProfilesService],
})
export class DoctorProfilesModule {}