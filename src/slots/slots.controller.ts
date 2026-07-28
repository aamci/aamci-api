// src/slots/slots.controller.ts
import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Req,
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
  Query,
} from '@nestjs/common';
import { SlotsService } from './slots.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

// To re-allow doctors to manage their own slots, add 'DOCTOR' to this array.
const CALENDAR_WRITE_ROLES = ['DOCTOR', 'FACILITY_MANAGER', 'SECRETARY', 'HOSPITAL'];

@Controller('slots')
//@UseGuards(JwtAuthGuard)
export class SlotsController {
  constructor(private readonly slots: SlotsService) {}

  private getUserId(req: any): string {
    return req.user?.userId;
  }

    @Get()
  async list(@Query('ownerId') ownerId?: string) {
    if (!ownerId) {
      return [];
    }
    return this.slots.findAllPublic(ownerId);
  }

  /**
   * 🌍 Public: génère les créneaux disponibles à partir des AvailabilityRules du médecin
   * C'est cet endpoint que le patient utilise pour voir le calendrier
   */
  @Get('available/:doctorId')
  async getAvailableSlots(
    @Param('doctorId') doctorId: string,
    @Query('from') from?: string,
    @Query('to') to?: string,
  ) {
    const fromDate = from ? new Date(from) : undefined;
    const toDate = to ? new Date(to) : undefined;
    return this.slots.generateAvailableSlots(doctorId, fromDate, toDate);
  }

  // 👉 version sécurisée (doctor connecté)
  @Get('mine')
  @UseGuards(JwtAuthGuard)
  async mySlots(@Req() req) {
    const userId = req.user.userId;
    console.log(`[SLOTS CONTROLLER] GET /slots/mine appelé pour userId: ${userId}`);
    const result = await this.slots.findAllByOwner(userId);
    console.log(`[SLOTS CONTROLLER] Retour de ${result.length} slots`);
    return result;
  }

  // @Get()
  // async list(@Req() req) {
  //   const userId = this.getUserId(req);
  //   if (!userId) throw new UnauthorizedException();
  //   return this.slots.findAllByOwner(userId);
  // }

  @Post()
  @UseGuards(JwtAuthGuard)
  async create(@Req() req, @Body() dto: any) {
    const userId = this.getUserId(req);
    if (!userId) throw new UnauthorizedException('Utilisateur non authentifié');
    if (!CALENDAR_WRITE_ROLES.includes(req.user.role)) throw new ForbiddenException('Seul un gestionnaire peut modifier le calendrier');

    return this.slots.create({
      ownerId: userId,
      ownerType: req.user.role === 'HOSPITAL' ? 'HOSPITAL' : 'DOCTOR',
      start: dto.start,
      end: dto.end,
      capacity: dto.capacity ?? 1,
      status: dto.status ?? 'ACTIVE',
    });
  }

    @Post('bulk')
  @UseGuards(JwtAuthGuard)
  async bulkCreate(@Req() req, @Body() body: { slots: Array<{ start: string; end: string; capacity?: number; status?: string }> }) {
    const userId = req.user.userId;
    if (!userId) throw new UnauthorizedException('Utilisateur non authentifié');
    if (!CALENDAR_WRITE_ROLES.includes(req.user.role)) throw new ForbiddenException('Seul un gestionnaire peut modifier le calendrier');

    return this.slots.bulkCreate(userId, body.slots || []);
  }

  @Post('generate')
  @UseGuards(JwtAuthGuard)
  async generateSlots(@Req() req, @Body() body: any) {
    const userId = req.user.userId;
    if (!userId) throw new UnauthorizedException('Utilisateur non authentifié');
    if (!CALENDAR_WRITE_ROLES.includes(req.user.role)) throw new ForbiddenException('Seul un gestionnaire peut modifier le calendrier');

    const {
      days,
      startHour,
      endHour,
      stepMinutes,
      startDate,
      endDate,
      excludedHours,
      capacity,
    } = body;

    return this.slots.generateSlotsForPeriod({
      ownerId: userId,
      ownerType: req.user.role === 'HOSPITAL' ? 'HOSPITAL' : 'DOCTOR',
      days: days || [],
      startHour: startHour || 8,
      endHour: endHour || 18,
      stepMinutes: stepMinutes || 30,
      startDate: startDate ? new Date(startDate) : new Date(),
      endDate: endDate ? new Date(endDate) : new Date(),
      excludedHours: excludedHours || [],
      capacity: capacity || 1,
    });
  }

  @Put(':id')
  @UseGuards(JwtAuthGuard)
  async update(@Req() req, @Param('id') id: string, @Body() dto: any) {
    const userId = this.getUserId(req);
    if (!userId) throw new UnauthorizedException();
    if (!CALENDAR_WRITE_ROLES.includes(req.user.role)) throw new ForbiddenException('Seul un gestionnaire peut modifier le calendrier');
    return this.slots.update(id, userId, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  async remove(@Req() req, @Param('id') id: string) {
    const userId = this.getUserId(req);
    if (!userId) throw new UnauthorizedException();
    if (!CALENDAR_WRITE_ROLES.includes(req.user.role)) throw new ForbiddenException('Seul un gestionnaire peut modifier le calendrier');
    return this.slots.remove(id, userId);
  }
}