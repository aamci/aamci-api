import { Module } from '@nestjs/common';
import { TeamController } from './team.controller';
import { TeamService } from './team.service';
import { PrismaService } from '../common/prisma.service';
import { EmailService } from '../common/email.service';

@Module({
  controllers: [TeamController],
  providers: [TeamService, PrismaService, EmailService],
  exports: [TeamService],
})
export class TeamModule {}
