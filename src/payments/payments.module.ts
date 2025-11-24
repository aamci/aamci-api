// apps/api/src/payments/payments.module.ts
import { Module } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { PaymentsController } from './payments.controller';
import { PrismaService } from '../common/prisma.service';
import { AirtelMoneyService } from './airtel-money/airtel-money.service';

@Module({
  controllers: [PaymentsController],
  providers: [PaymentsService, PrismaService, AirtelMoneyService],
  exports: [PaymentsService],
})
export class PaymentsModule {}