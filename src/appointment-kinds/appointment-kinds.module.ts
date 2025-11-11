import { Module } from '@nestjs/common';
import { AppointmentKindsController } from './appointment-kinds.controller';
import { AppointmentKindsService } from './appointment-kinds.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [AppointmentKindsController],
  providers: [AppointmentKindsService, PrismaService],
})
export class AppointmentKindsModule {}