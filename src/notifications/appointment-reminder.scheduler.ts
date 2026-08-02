import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';
import { NotificationsService } from './notifications.service';
import { SmsService } from '../common/sms.service';

@Injectable()
export class AppointmentReminderScheduler {
  private readonly logger = new Logger(AppointmentReminderScheduler.name);

  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
    private smsService: SmsService,
  ) {}

  /**
   * Runs every day at 09:00 AM (Africa/Brazzaville = UTC+1).
   * Sends in-app notification + SMS to patients with an appointment tomorrow.
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
      include: {
        patient: { select: { id: true, fullName: true, phone: true } },
        slot:    { select: { start: true, ownerId: true } },
        kind:    { select: { name: true } },
      },
    });

    // Load SMS opt-in preferences in bulk
    const patientIds = [...new Set(appointments.map(a => a.patientId))];
    const prefs = await (this.prisma as any).patientProfile.findMany({
      where: { userId: { in: patientIds } },
      select: { userId: true, smsReminderEnabled: true },
    });
    const smsEnabled = new Map(prefs.map((p: any) => [p.userId, p.smsReminderEnabled !== false]));

    this.logger.log(`Found ${appointments.length} appointment(s) scheduled for tomorrow`);

    // Prefetch doctor names for the relevant ownerIds
    const ownerIds = [...new Set(appointments.map(a => a.slot.ownerId))];
    const doctors  = await this.prisma.user.findMany({
      where: { id: { in: ownerIds } },
      select: { id: true, fullName: true },
    });
    const doctorMap = Object.fromEntries(doctors.map(d => [d.id, d.fullName ?? 'votre médecin']));

    let notifSent = 0;
    let smsSent = 0;

    for (const appointment of appointments) {
      // In-app notification
      try {
        await this.notificationsService.createAppointmentReminder(
          appointment.patientId,
          appointment.id,
          new Date(appointment.slot.start),
        );
        notifSent++;
      } catch (error) {
        this.logger.error(`Failed in-app reminder for appointment ${appointment.id}: ${error?.message}`);
      }

      // SMS reminder — respect patient opt-out
      const phone = appointment.patient?.phone;
      if (phone && smsEnabled.get(appointment.patientId) !== false) {
        const timeStr = new Date(appointment.slot.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' });
        const doctorName = doctorMap[appointment.slot.ownerId] ?? 'votre médecin';
        const kindName = appointment.kind?.name ?? 'Consultation';
        const msg = `Rappel Ibogha 241 : RDV "${kindName}" demain à ${timeStr} avec ${doctorName}. Arrivez 10 min avant.`;
        const ok = await this.smsService.send(phone, msg);
        if (ok) smsSent++;
      }
    }

    this.logger.log(`Daily reminders done — in-app: ${notifSent}, SMS: ${smsSent}`);
  }

  /**
   * 1-hour before reminder: runs every 30 min, sends SMS to patients whose appt is in 50-70 min.
   */
  @Cron('*/30 * * * *', { name: 'sms-hour-reminders', timeZone: 'Africa/Brazzaville' })
  async sendHourBeforeSmS() {
    const now = new Date();
    const windowStart = new Date(now.getTime() + 50 * 60 * 1000);
    const windowEnd   = new Date(now.getTime() + 70 * 60 * 1000);

    const appointments = await this.prisma.appointment.findMany({
      where: {
        status: 'CONFIRMED',
        slot: { start: { gte: windowStart, lte: windowEnd } },
      },
      include: {
        patient: { select: { fullName: true, phone: true } },
        slot:    { select: { start: true, ownerId: true } },
        kind:    { select: { name: true } },
      },
    });

    const hourOwnerIds = [...new Set(appointments.map(a => a.slot.ownerId))];
    const hourDoctors  = await this.prisma.user.findMany({
      where: { id: { in: hourOwnerIds } },
      select: { id: true, fullName: true },
    });
    const hourDoctorMap = Object.fromEntries(hourDoctors.map(d => [d.id, d.fullName ?? 'votre médecin']));

    for (const appt of appointments) {
      const phone = appt.patient?.phone;
      if (!phone) continue;
      const timeStr = new Date(appt.slot.start).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', timeZone: 'Africa/Brazzaville' });
      const doctor = hourDoctorMap[appt.slot.ownerId] ?? 'votre médecin';
      const msg = `Ibogha 241 : Votre RDV avec ${doctor} est dans 1 heure (${timeStr}). Merci d'être à l'heure.`;
      await this.smsService.send(phone, msg).catch(() => {});
    }
  }
}
