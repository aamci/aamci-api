import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../common/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

 
  @Get()
  async list(@Req() req) {
    const userId = req.user.userId;
    const role = req.user.role;
    return this.svc.findForUser(userId, role);
  }

  @Patch(':id/status')
  async updateStatus(
    @Req() req,
    @Param('id') id: string,
    @Body() dto: { status: 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW' | 'COMPLETED' },
  ) {
    const userId = req.user.userId;
    const role = req.user.role;
    return this.svc.updateStatusAsOwner(id, userId, dto.status, role);
  }

  @Patch(':id/reschedule')
  async reschedule(@Req() req, @Param('id') id: string, @Body() dto: { newStart: string }) {
    const userId = req.user.userId;
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
    const userId = req.user.userId;
    console.log(`[APPT CONTROLLER] PATCH /appointments/${id} appelé par userId: ${userId}`);
    console.log(`[APPT CONTROLLER] DTO reçu:`, JSON.stringify(dto, null, 2));

    const result = await this.svc.updateAsOwner(id, userId, dto, req.user.role);

    console.log(`[APPT CONTROLLER] Rendez-vous mis à jour avec succès`);
    return result;
  }

  @Get('history/global')
  async getGlobalHistory(
    @Req() req,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('action') action?: string,
    @Query('doctorIds') doctorIds?: string,
  ) {
    const userId = req.user.userId;
    const role   = req.user.role;
    return this.svc.getGlobalHistory(userId, role, {
      page:  page  ? Number(page)  : undefined,
      limit: limit ? Number(limit) : undefined,
      action,
      doctorIds: doctorIds ? doctorIds.split(',') : undefined,
    });
  }

  @Get(':id/history')
  async getHistory(@Param('id') id: string) {
    return this.svc.getHistory(id);
  }

  @Get(':id')
  async getById(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.svc.findByIdForUser(id, userId);
  }

  @Post(':id/check-in')
  async checkIn(@Param('id') id: string, @Req() req) {
    return this.svc.checkIn(id, req.user.userId);
  }

  @Post(':id/start-video')
  async startVideoSession(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.svc.startVideoSession(id, userId);
  }

  @Post(':id/end-video')
  async endVideoSession(
    @Param('id') id: string,
    @Body() dto: { notes?: string },
    @Req() req
  ) {
    const userId = req.user.userId;
    return this.svc.endVideoSession(id, userId, dto.notes);
  }

  @Post()
  async create(
    @Body() dto: {
      slotId?: string;
      slotStart?: string;
      slotEnd?: string;
      patientId?: string;
      doctorId?: string;
      kindId?: string;
      notes?: string;
      facilityId?: string;
      beneficiaryName?: string;
      beneficiaryPhone?: string;
      recurrence?: { frequency: 'WEEKLY' | 'BIWEEKLY' | 'MONTHLY'; count: number };
    },
    @Req() req: any
  ) {
    const userId = req.user.userId;
    const role = req.user.role;

    // Si slotStart et slotEnd sont fournis, créer le slot à la volée
    if (dto.slotStart && dto.slotEnd) {
      const doctorId = role === 'DOCTOR' ? userId : dto.doctorId;
      const basePayload = {
        patientId: dto.patientId || userId,
        slotStart: dto.slotStart,
        slotEnd: dto.slotEnd,
        kindId: dto.kindId,
        notes: dto.notes,
        doctorId,
        facilityId: dto.facilityId,
        beneficiaryName: dto.beneficiaryName,
        beneficiaryPhone: dto.beneficiaryPhone,
      };

      if (dto.recurrence && dto.recurrence.count > 1) {
        return this.svc.createRecurringSeries(basePayload, dto.recurrence);
      }

      return this.svc.createWithNewSlot(basePayload);
    }

    // Sinon, utiliser le slotId existant
    return this.svc.createForPatient(userId, dto.slotId!, dto.notes);
  }

}