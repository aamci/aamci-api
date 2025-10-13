import { Body, Controller, Get, Post, Req, UseGuards } from '@nestjs/common';
import { AppointmentsService } from './appointments.service';
import { JwtAuthGuard } from '../common/jwt.guard';

@UseGuards(JwtAuthGuard)
@Controller('appointments')
export class AppointmentsController {
  constructor(private readonly svc: AppointmentsService) {}

  @Get()
  list() { return this.svc.list(); }

  @Post()
  create(@Body() dto: { slotId: string; notes?: string }, @Req() req: any) {
    // req.user = { userId, email, role }
    return this.svc.create({ slotId: dto.slotId, patientId: req.user.userId, notes: dto.notes });
  }
}