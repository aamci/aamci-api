import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';
import { NotificationsModule } from '../notifications/notifications.module';

@Module({
  imports: [NotificationsModule],
  controllers: [TeamController],
  providers: [TeamService, PrismaService, EmailService],
  exports: [TeamService],
})
export class TeamModule {}
