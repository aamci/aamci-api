// src/appointments/appointments.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

type AppointmentStatus = 'PENDING' | 'CONFIRMED' | 'CANCELLED' | 'NO_SHOW';

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  list() {
    return this.prisma.appointment.findMany({
      take: 25,
      orderBy: { createdAt: 'desc' },
    });
  }

  create(dto: { slotId: string; patientId: string; notes?: string }) {
    return this.prisma.appointment.create({
      data: {
        slotId: dto.slotId,
        patientId: dto.patientId,
        status: 'PENDING' as AppointmentStatus, // <-- fixed
        notes: dto.notes,
      },
    });
  }
}