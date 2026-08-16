import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { ConsultationsService } from './consultations.service';

@Controller('consultations')
@UseGuards(JwtAuthGuard)
export class ConsultationsController {
  constructor(private readonly svc: ConsultationsService) {}

  @Post()
  async create(
    @Req() req,
    @Body() dto: { patientId: string; appointmentId?: string; motif?: string },
  ) {
    const doctorId = req.user.userId;
    return this.svc.create(doctorId, dto);
  }

  @Get('mine')
  async listMine(@Req() req) {
    const doctorId = req.user.userId;
    return this.svc.listForDoctor(doctorId);
  }

  @Get('patient/:patientId')
  async listForPatient(
    @Param('patientId') patientId: string,
    @Req() req,
    @Query('status') status?: string,
  ) {
    const doctorId = req.user.userId;
    return this.svc.listForPatient(patientId, doctorId, status);
  }

  @Get('patient/:patientId/active')
  async getActive(
    @Param('patientId') patientId: string,
    @Req() req,
  ) {
    const doctorId = req.user.userId;
    return this.svc.getActive(patientId, doctorId);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.svc.findById(id, userId);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req,
    @Body()
    dto: {
      motif?: string;
      interrogatoire?: string;
      examen?: string;
      notes?: string;
    },
  ) {
    const doctorId = req.user.userId;
    return this.svc.update(id, doctorId, dto);
  }

  @Post(':id/end')
  async end(
    @Param('id') id: string,
    @Req() req,
    @Body()
    dto: {
      motif?: string;
      interrogatoire?: string;
      examen?: string;
      notes?: string;
    },
  ) {
    const doctorId = req.user.userId;
    return this.svc.end(id, doctorId, dto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.remove(id, doctorId);
  }
}
