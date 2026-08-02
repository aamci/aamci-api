import { Module } from '@nestjs/common';
import { BeneficiariesController } from './beneficiaries.controller';
import { BeneficiariesService } from './beneficiaries.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [BeneficiariesController],
  providers: [BeneficiariesService, PrismaService],
})
export class BeneficiariesModule {}
