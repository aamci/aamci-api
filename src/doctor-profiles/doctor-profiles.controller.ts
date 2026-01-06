import { Body, Controller, Get, Post, Put, Req, UseGuards } from '@nestjs/common';
import { DoctorProfilesService } from './doctor-profiles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('doctor-profiles')
@UseGuards(JwtAuthGuard)
export class DoctorProfilesController {
  constructor(private readonly svc: DoctorProfilesService) {}

  // GET /doctor-profiles/me
  @Get('me')
  async me(@Req() req) {
    const userId = req.user.id || req.user.userId;
    return this.svc.getMine(userId);
  }

  // POST /doctor-profiles  → crée si absent
  @Post()
  async createMine(@Req() req) {
    const userId = req.user.id || req.user.userId;
    return this.svc.createMine(userId);
  }

  // PUT /doctor-profiles/me  → met à jour
  @Put('me')
  async updateMine(@Req() req, @Body() body: any) {
    const userId = req.user.id || req.user.userId;
    return this.svc.updateMine(userId, body ?? {});
  }
}