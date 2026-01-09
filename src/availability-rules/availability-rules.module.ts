import { Module } from '@nestjs/common';
import { AvailabilityRulesController } from './availability-rules.controller';
import { AvailabilityRulesService } from './availability-rules.service';
import { PrismaService } from '../common/prisma.service';
import { FacilityManagersModule } from '../facility-managers/facility-managers.module';

@Module({
  imports: [FacilityManagersModule],
  controllers: [AvailabilityRulesController],
  providers: [AvailabilityRulesService, PrismaService],
  exports: [AvailabilityRulesService], // Export for use in other modules
})
export class AvailabilityRulesModule {}
