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
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { TasksService } from './tasks.service';

@Controller('tasks')
@UseGuards(JwtAuthGuard)
export class TasksController {
  constructor(private readonly svc: TasksService) {}

  @Get()
  async list(
    @Req() req,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('category') category?: string,
    @Query('patientId') patientId?: string,
    @Query('dueBefore') dueBefore?: string,
    @Query('dueAfter') dueAfter?: string,
  ) {
    const doctorId = req.user.userId;
    return this.svc.listForDoctor(doctorId, {
      status,
      priority,
      category,
      patientId,
      dueBefore,
      dueAfter,
    });
  }

  @Get('stats')
  async getStats(@Req() req) {
    const doctorId = req.user.userId;
    return this.svc.getStats(doctorId);
  }

  @Get('reminders')
  async getReminders(@Req() req) {
    const doctorId = req.user.userId;
    return this.svc.getReminders(doctorId);
  }

  @Get(':id')
  async findById(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.findById(id, doctorId);
  }

  @Post()
  async create(
    @Req() req,
    @Body()
    dto: {
      title: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      category?: 'FOLLOW_UP' | 'CALL' | 'PRESCRIPTION' | 'LAB_REVIEW' | 'ADMIN' | 'APPOINTMENT' | 'OTHER';
      patientId?: string;
      dueDate?: string;
      reminderAt?: string;
      tags?: string[];
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
      title?: string;
      description?: string;
      priority?: 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';
      category?: 'FOLLOW_UP' | 'CALL' | 'PRESCRIPTION' | 'LAB_REVIEW' | 'ADMIN' | 'APPOINTMENT' | 'OTHER';
      status?: 'TODO' | 'IN_PROGRESS' | 'DONE' | 'CANCELLED';
      patientId?: string | null;
      dueDate?: string | null;
      reminderAt?: string | null;
      tags?: string[];
    },
  ) {
    const doctorId = req.user.userId;
    return this.svc.update(id, doctorId, dto);
  }

  @Post(':id/done')
  async markAsDone(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.markAsDone(id, doctorId);
  }

  @Delete(':id')
  async delete(@Param('id') id: string, @Req() req) {
    const doctorId = req.user.userId;
    return this.svc.delete(id, doctorId);
  }
}
