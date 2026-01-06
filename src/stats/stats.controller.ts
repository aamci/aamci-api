// apps/api/src/stats/stats.controller.ts
import {
  Controller,
  Get,
  UseGuards,
  Req,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { StatsService } from './stats.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('stats')
@UseGuards(JwtAuthGuard)
export class StatsController {
  constructor(private readonly statsService: StatsService) {}

  // 🔹 DOCTOR — déjà présent
  @Get('doctor/overview')
  async doctorOverview(@Req() req) {
    const user = req.user;
    if (!user || user.role !== 'DOCTOR') {
      throw new ForbiddenException('Réservé aux médecins');
    }
    return this.statsService.getDoctorOverview(user.userId);
  }

  @Get('doctor/next-appointments')
  async doctorNextAppointments(
    @Req() req,
    @Query('limit') limit?: string,
  ) {
    const user = req.user;
    if (!user || user.role !== 'DOCTOR') {
      throw new ForbiddenException('Réservé aux médecins');
    }
    const n = limit ? Math.min(Number(limit) || 5, 20) : 5;
    return this.statsService.getDoctorNextAppointments(user.userId, n);
  }

  // 🔹 DOCTOR — timeline revenus pour les graph
  @Get('doctor/revenue-timeline')
  async doctorRevenueTimeline(
    @Req() req,
    @Query('days') days?: string,
  ) {
    const user = req.user;
    if (!user || user.role !== 'DOCTOR') {
      throw new ForbiddenException('Réservé aux médecins');
    }
    const d = days ? Math.min(Math.max(Number(days) || 30, 7), 90) : 30;
    return this.statsService.getDoctorRevenueTimeline(user.userId, d);
  }

  // 🔹 ADMIN — overview global
  @Get('admin/overview')
  async adminOverview(@Req() req) {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Réservé à l’admin');
    }
    return this.statsService.getAdminOverview();
  }

  // 🔹 ADMIN — stats détaillées par médecin
  @Get('admin/doctors')
  async adminDoctorsStats(@Req() req) {
    const user = req.user;
    if (!user || user.role !== 'ADMIN') {
      throw new ForbiddenException('Réservé à l’admin');
    }
    return this.statsService.getAdminDoctorsStats();
  }
}