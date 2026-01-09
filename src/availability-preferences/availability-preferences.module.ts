import { Module } from '@nestjs/common';
import { AvailabilityPreferencesService } from './availability-preferences.service';
import { AvailabilityPreferencesController } from './availability-preferences.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [AvailabilityPreferencesController],
  providers: [AvailabilityPreferencesService, PrismaService],
  exports: [AvailabilityPreferencesService],
})
export class AvailabilityPreferencesModule {}
