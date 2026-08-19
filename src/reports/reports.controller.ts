import { Controller, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ReportsService } from './reports.service';

@UseGuards(JwtAuthGuard)
@Controller('reports')
export class ReportsController {
  constructor(private svc: ReportsService) {}

  @Post()
  create(@Req() req, @Body() body: {
    targetId: string;
    type: string;
    reason: string;
    details?: string;
    conversationId?: string;
  }) {
    return this.svc.create(req.user.userId, body);
  }
}
