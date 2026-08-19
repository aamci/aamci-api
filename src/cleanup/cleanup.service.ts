import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class CleanupService {
  private readonly logger = new Logger(CleanupService.name);

  constructor(private readonly prisma: PrismaService) {}

  // Exécution chaque nuit à 02h00
  @Cron('0 2 * * *')
  async deleteExpiredAccounts() {
    const now = new Date();
    const expired = await this.prisma.user.findMany({
      where: {
        isActive: false,
        scheduledDeletionAt: { lte: now },
      } as any,
      select: { id: true, email: true },
    });

    if (expired.length === 0) return;

    this.logger.log(`Suppression définitive de ${expired.length} compte(s) expirés`);

    for (const user of expired) {
      try {
        await this.prisma.user.delete({ where: { id: user.id } });
        this.logger.log(`Compte supprimé définitivement : ${user.email}`);
      } catch (error) {
        this.logger.error(`Erreur suppression compte ${user.email}:`, error);
      }
    }
  }
}
