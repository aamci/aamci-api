import { Injectable, OnModuleInit, Logger } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit() {
    if (process.env.PRISMA_CONNECT_ON_BOOT === 'true') {
      // Optional: attempt a short, bounded connect (not infinite retry)
      try {
        await this.$connect();
        this.logger.log('Prisma connected');
      } catch (e) {
        this.logger.error('Prisma connect failed (non-fatal at boot)', e as any);
        // Do NOT throw here, let the API start so the port opens
      }
    } else {
      this.logger.warn('Skipping Prisma connect on boot (PRISMA_CONNECT_ON_BOOT != true)');
    }
  }
}