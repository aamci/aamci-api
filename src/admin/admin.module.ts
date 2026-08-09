import { Module } from '@nestjs/common';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';
import { DataPurgeService } from '../common/data-purge.service';

@Module({
  controllers: [AdminController],
  providers: [AdminService, PrismaService, EmailService, DataPurgeService],
})
export class AdminModule {}
