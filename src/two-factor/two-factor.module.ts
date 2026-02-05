import { Module } from '@nestjs/common';
import { TwoFactorController } from './two-factor.controller';
import { TwoFactorService } from './two-factor.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  controllers: [TwoFactorController],
  providers: [TwoFactorService, PrismaService],
  exports: [TwoFactorService],
})
export class TwoFactorModule {}
