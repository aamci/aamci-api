import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
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
  async create(
    @Req() req,
    @Body() dto: {
      name: string;
      description?: string;
      isTelemedicine?: boolean;
      durationMins?: number;
      color?: string;
    }
  ) {
    const userId = req.user.id || req.user.userId;
    return this.svc.createForDoctor(userId, dto);
  }

  @Patch(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: {
      name?: string;
      description?: string;
      isTelemedicine?: boolean;
      durationMins?: number;
      color?: string;
    }
  ) {
    const userId = req.user.id || req.user.userId;
    return this.svc.updateForDoctor(userId, id, dto);
  }

  @Delete(':id')
  async delete(@Req() req, @Param('id') id: string) {
    const userId = req.user.id || req.user.userId;
    return this.svc.deleteForDoctor(userId, id);
  }
}