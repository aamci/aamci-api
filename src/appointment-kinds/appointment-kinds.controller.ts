import { Controller, Get, Post, Patch, Delete, Body, Param, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { AppointmentKindsService } from './appointment-kinds.service';

@Controller('appointment-kinds')
export class AppointmentKindsController {
  constructor(private readonly svc: AppointmentKindsService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async list(@Req() req) {
    const userId = req.user.id || req.user.userId;
    const role = req.user.role;
    return this.svc.listForUser(userId, role);
  }

  /** Public endpoint: get appointment kinds for a specific doctor */
  @Get('doctor/:doctorId')
  async listForDoctor(@Param('doctorId') doctorId: string) {
    return this.svc.listPublicForDoctor(doctorId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
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
  @UseGuards(JwtAuthGuard)
  async delete(@Req() req, @Param('id') id: string) {
    const userId = req.user.id || req.user.userId;
    return this.svc.deleteForDoctor(userId, id);
  }
}