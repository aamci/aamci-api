import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/jwt.guard';
import { InvoicesService } from './invoices.service';

@Controller('invoices')
@UseGuards(JwtAuthGuard)
export class InvoicesController {
  constructor(private readonly svc: InvoicesService) {}

  @Get()
  async list(
    @Req() req,
    @Query('status') status?: string,
    @Query('patientId') patientId?: string,
    @Query('appointmentId') appointmentId?: string,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const doctorId = req.user.userId;
    return this.svc.listForDoctor(doctorId, {
      status,
      patientId,
      appointmentId,
      startDate,
      endDate,
    });
  }

  @Get('stats')
  async getStats(
    @Req() req,
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
  ) {
    const doctorId = req.user.userId;
    return this.svc.getStats(doctorId, { startDate, endDate });
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
      items: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
      }>;
      taxRate?: number;
      dueDate?: string;
      notes?: string;
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
      items?: Array<{
        description: string;
        quantity: number;
        unitPrice: number;
      }>;
      taxRate?: number;
      dueDate?: string;
      notes?: string;
    },
  ) {
    const doctorId = req.user.userId;
    return this.svc.update(id, doctorId, dto);
  }

  @Post(':id/send')
  async send(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.send(id, doctorId);
  }

  @Post(':id/mark-paid')
  async markAsPaid(
    @Param('id') id: string,
    @Req() req,
    @Body() dto: { paymentMethod?: string },
  ) {
    const doctorId = req.user.userId;
    return this.svc.markAsPaid(id, doctorId, dto.paymentMethod);
  }

  @Post(':id/cancel')
  async cancel(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.cancel(id, doctorId);
  }
}
