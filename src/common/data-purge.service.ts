import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from './prisma.service';

@Injectable()
export class DataPurgeService {
  private readonly logger = new Logger(DataPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Runs every day at 03:00 server time
  @Cron('0 3 * * *')
  async purgeOldData() {
    const cutoff = new Date();
    cutoff.setFullYear(cutoff.getFullYear() - 1); // 12 months ago

    this.logger.log(`Starting data purge — cutoff: ${cutoff.toISOString()}`);

    try {
      // Read notifications older than 12 months (unread ones are kept)
      const notifications = await this.prisma.notification.deleteMany({
        where: { read: true, createdAt: { lt: cutoff } },
      });

      // Admin audit logs older than 12 months
      const auditLogs = await this.prisma.adminAuditLog.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      // Appointment status history older than 12 months
      const appointmentHistory = await this.prisma.appointmentHistory.deleteMany({
        where: { createdAt: { lt: cutoff } },
      });

      this.logger.log(
        `Purge complete — notifications: ${notifications.count}, ` +
        `auditLogs: ${auditLogs.count}, ` +
        `appointmentHistory: ${appointmentHistory.count}`,
      );
    } catch (err) {
      this.logger.error('Data purge failed', err);
    }
  }
}
