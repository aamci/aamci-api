import { Module } from '@nestjs/common';
import { CalendarSyncController } from './calendar-sync.controller';
import { CalendarSyncService } from './calendar-sync.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [CalendarSyncController],
  providers: [CalendarSyncService, PrismaService],
  exports: [CalendarSyncService],
})
export class CalendarSyncModule {}
