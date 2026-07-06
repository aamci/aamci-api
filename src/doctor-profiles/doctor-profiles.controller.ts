import { Body, Controller, Delete, Get, Param, Post, Put, Query, Req, UseGuards } from '@nestjs/common';
import { DoctorProfilesService } from './doctor-profiles.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('doctor-profiles')
export class DoctorProfilesController {
  constructor(private readonly svc: DoctorProfilesService) {}

  @Get('me')
  @UseGuards(JwtAuthGuard)
  async me(@Req() req) {
    return this.svc.getMine(req.user.userId);
  }

  @Post()
  @UseGuards(JwtAuthGuard)
  async createMine(@Req() req) {
    return this.svc.createMine(req.user.userId);
  }

  @Put('me')
  @UseGuards(JwtAuthGuard)
  async updateMine(@Req() req, @Body() body: any) {
    return this.svc.updateMine(req.user.userId, body ?? {});
  }

  @Get('search')
  async search(@Query('q') q: string) {
    return this.svc.search(q ?? '');
  }

  // ─── Gestion des établissements du médecin ───────────────────────────────

  @Get('me/facilities')
  @UseGuards(JwtAuthGuard)
  async myFacilities(@Req() req) {
    return this.svc.getFacilities(req.user.userId);
  }

  @Post('me/facilities')
  @UseGuards(JwtAuthGuard)
  async addFacility(@Req() req, @Body() body: { facilityId: string }) {
    return this.svc.addFacility(req.user.userId, body.facilityId);
  }

  @Delete('me/facilities/:facilityId')
  @UseGuards(JwtAuthGuard)
  async removeFacility(@Req() req, @Param('facilityId') facilityId: string) {
    return this.svc.removeFacility(req.user.userId, facilityId);
  }

  // Public — permet au patient de voir les structures d'un médecin
  @Get(':doctorId/facilities')
  async doctorFacilities(@Param('doctorId') doctorId: string) {
    return this.svc.getFacilitiesById(doctorId);
  }
}
