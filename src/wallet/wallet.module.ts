// apps/api/src/wallet/wallet.module.ts
import { Module } from '@nestjs/common';
import { WalletController } from './wallet.controller';
import { WalletService } from './wallet.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [WalletController],
  providers: [WalletService, PrismaService],
})
export class WalletModule {}