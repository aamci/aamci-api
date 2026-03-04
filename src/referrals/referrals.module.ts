import { Module } from '@nestjs/common';
import { ReferralsController } from './referrals.controller';
import { ReferralsService } from './referrals.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [ReferralsController],
  providers: [ReferralsService, PrismaService],
})
export class ReferralsModule {}
