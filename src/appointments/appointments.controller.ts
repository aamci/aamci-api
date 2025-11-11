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

  @Post()
  create(@Body() dto: { slotId: string; notes?: string }, @Req() req: any) {
    // req.user = { userId, email, role }
    return this.svc.create({ slotId: dto.slotId, patientId: req.user.userId, notes: dto.notes });
  }
  
}