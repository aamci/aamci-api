import { Module } from '@nestjs/common';
import { FacilityManagersService } from './facility-managers.service';
import { FacilityManagersController } from './facility-managers.controller';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [FacilityManagersController],
  providers: [FacilityManagersService, PrismaService],
  exports: [FacilityManagersService],
})
export class FacilityManagersModule {}
