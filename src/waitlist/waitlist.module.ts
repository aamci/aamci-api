import { Module } from '@nestjs/common';
import { WaitlistController } from './waitlist.controller';
import { WaitlistService } from './waitlist.service';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';

@Module({
  controllers: [WaitlistController],
  providers: [WaitlistService, PrismaService, EmailService],
  exports: [WaitlistService],
})
export class WaitlistModule {}
