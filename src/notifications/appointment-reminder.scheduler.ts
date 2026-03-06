import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from './notifications.service';

@Injectable()
export class AppointmentReminderScheduler {
  private readonly logger = new Logger(AppointmentReminderScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  /**
   * Runs every day at 09:00 AM.
   * Sends a reminder email + in-app notification to patients
   * whose appointment is scheduled for the next calendar day.
   */
  @Cron('0 9 * * *', { name: 'appointment-reminders', timeZone: 'Africa/Brazzaville' })
  async sendDailyReminders() {
    this.logger.log('Running daily appointment reminders...');

    const now = new Date();

    const tomorrowStart = new Date(now);
    tomorrowStart.setDate(tomorrowStart.getDate() + 1);
    tomorrowStart.setHours(0, 0, 0, 0);

    const tomorrowEnd = new Date(tomorrowStart);
    tomorrowEnd.setHours(23, 59, 59, 999);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: { in: ['CONFIRMED', 'PENDING'] },
        slot: {
          start: {
            gte: tomorrowStart,
            lte: tomorrowEnd,
          },
        },
      },
      select: {
        id: true,
        patientId: true,
        slot: { select: { start: true } },
      },
    });

    this.logger.log(`Found ${appointments.length} appointment(s) scheduled for tomorrow`);

    let sent = 0;
    let failed = 0;

    for (const appointment of appointments) {
      try {
        await this.notificationsService.createAppointmentReminder(
          appointment.patientId,
          appointment.id,
          new Date(appointment.slot.start),
        );
        sent++;
      } catch (error) {
        this.logger.error(
          `Failed to send reminder for appointment ${appointment.id}: ${error?.message}`,
        );
        failed++;
      }
    }

    this.logger.log(`Daily reminders done — sent: ${sent}, failed: ${failed}`);
  }
}
