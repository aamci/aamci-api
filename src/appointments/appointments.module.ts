import { Module } from '@nestjs/common';
import { AppointmentsController } from './appointments.controller';
import { AppointmentsService } from './appointments.service';
import { PrismaService } from '../common/prisma.service';
import { DoctorAbsencesModule } from '../doctor-absences/doctor-absences.module';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [DoctorAbsencesModule, NotificationsModule],
  controllers: [AppointmentsController],
  providers: [AppointmentsService, PrismaService],
})
export class AppointmentsModule {}
