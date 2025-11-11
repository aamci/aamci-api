import { Controller, Get, Post, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { AppointmentKindsService } from './appointment-kinds.service';

@Controller('appointment-kinds')
@UseGuards(JwtAuthGuard)
export class AppointmentKindsController {
  constructor(private readonly svc: AppointmentKindsService) {}

  @Get()
  async list(@Req() req) {
    const userId = req.user.id || req.user.userId;
    const role = req.user.role;
    return this.svc.listForUser(userId, role);
  }

  @Post()
  async create(@Req() req, @Body() dto: { name: string; description?: string }) {
    const userId = req.user.id || req.user.userId;
    return this.svc.createForDoctor(userId, dto);
  }
}