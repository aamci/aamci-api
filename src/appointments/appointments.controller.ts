import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../common/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

 
  @Get()
  async list(@Req() req) {
    const userId = req.user.id || req.user.userId;
    const role = req.user.role;
    return this.svc.findForUser(userId, role);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' },
  ) {
    const userId = req.user.id || req.user.userId;
    return this.svc.updateStatusAsOwner(id, userId, dto.status);
  }

  @Patch(':id/reschedule')
  async reschedule(@Req() req, @Param('id') id: string, @Body() dto: { newStart: string }) {
    const userId = req.user.id || req.user.userId;
    return this.svc.rescheduleAsOwner(id, userId, dto.newStart);
  }

  @Patch(':id')
  async update(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: {
      slotStart?: string;
      slotEnd?: string;
      patientId?: string;
      kindId?: string;
      notes?: string;
    }
  ) {
    const userId = req.user.id || req.user.userId;
    console.log(`[APPT CONTROLLER] PATCH /appointments/${id} appelé par userId: ${userId}`);
    console.log(`[APPT CONTROLLER] DTO reçu:`, JSON.stringify(dto, null, 2));

    const result = await this.svc.updateAsOwner(id, userId, dto);

    console.log(`[APPT CONTROLLER] Rendez-vous mis à jour avec succès`);
    return result;
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.svc.getHistory(id);
  }

  @Post()
  async create(
    @Body() dto: {
      slotId?: string;
      slotStart?: string;
      slotEnd?: string;
      patientId?: string;
      kindId?: string;
      notes?: string
    },
    @Req() req: any
  ) {
    const userId = req.user.userId || req.user.sub;
    const role = req.user.role;

    // Si slotStart et slotEnd sont fournis, créer d'abord le slot
    if (dto.slotStart && dto.slotEnd) {
      return this.svc.createWithNewSlot({
        patientId: dto.patientId || userId,
        slotStart: dto.slotStart,
        slotEnd: dto.slotEnd,
        kindId: dto.kindId,
        notes: dto.notes,
        doctorId: role === 'DOCTOR' ? userId : undefined,
      });
    }

    // Sinon, utiliser le slotId existant
    return this.svc.create({
      slotId: dto.slotId!,
      patientId: dto.patientId || userId,
      notes: dto.notes
    });
  }

}