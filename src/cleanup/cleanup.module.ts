import { Module } from '@nestjs/common';
import { CleanupService } from './cleanup.service';
import { PrismaService } from '../common/prisma.service';

@Module({
  providers: [CleanupService, PrismaService],
})
export class CleanupModule {}
