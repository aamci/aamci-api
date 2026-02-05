import { Module } from '@nestjs/common';
import { HealthRecordsController } from './health-records.controller';
import { HealthRecordsService } from './health-records.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [HealthRecordsController],
  providers: [HealthRecordsService, PrismaService],
  exports: [HealthRecordsService],
})
export class HealthRecordsModule {}
