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
import { PrescriptionsService } from './prescriptions.service';

@Controller('prescriptions')
@UseGuards(JwtAuthGuard)
export class PrescriptionsController {
  constructor(private readonly svc: PrescriptionsService) {}

  @Get()
  async list(
    @Req() req,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const doctorId = req.user.userId;
    return this.svc.listForDoctor(doctorId, {
      status,
      patientId,
      startDate,
      endDate,
    });
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

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req) {
    const userId = req.user.userId;
    return this.svc.findById(id, userId);
  }

  @Post()
  async create(
    @Req() req,
    @Body()
    dto: {
      patientId: string;
      appointmentId?: string;
      diagnosis?: string;
      generalInstructions?: string;
      validUntil?: string;
      medications: Array<{
        name: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
        quantity?: number;
      }>;
    },
  ) {
    const doctorId = req.user.userId;
    return this.svc.create(doctorId, dto);
  }

  @Patch(':id')
  async update(
    @Param('id') id: string,
    @Req() req,
    @Body()
    dto: {
      diagnosis?: string;
      generalInstructions?: string;
      validUntil?: string;
      medications?: Array<{
        name: string;
        dosage?: string;
        frequency?: string;
        duration?: string;
        instructions?: string;
        quantity?: number;
      }>;
    },
  ) {
    const doctorId = req.user.userId;
    return this.svc.update(id, doctorId, dto);
  }

  @Post(':id/activate')
  async activate(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.activate(id, doctorId);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.cancel(id, doctorId);
  }

  @Post(':id/renew')
  async renew(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: { validUntil?: string },
  ) {
    const doctorId = req.user.userId;
    return this.svc.renew(id, doctorId, dto.validUntil);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.delete(id, doctorId);
  }

  // ── Patient-facing: request renewal ───────────────────────────────────────

  @Post(':id/request-renewal')
  async requestRenewal(
    @Param('id') id: string,
    @Req() req,
    @Body() body: { message?: string },
  ) {
    return this.svc.requestRenewal(id, req.user.userId, body.message);
  }
}
