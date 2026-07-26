import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { NotificationsGateway } from './notifications.gateway';
import { AppointmentReminderScheduler } from './appointment-reminder.scheduler';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';
import { SmsService } from '../common/sms.service';

@Module({
  imports: [
    JwtModule.register({
      secret: process.env.JWT_SECRET ?? 'secret',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [NotificationsController],
  providers: [
    NotificationsService,
    NotificationsGateway,
    AppointmentReminderScheduler,
    PrismaService,
    EmailService,
    SmsService,
  ],
  exports: [NotificationsService, NotificationsGateway],
})
export class NotificationsModule {}
