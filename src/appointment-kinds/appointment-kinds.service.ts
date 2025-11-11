import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AppointmentKindsService {
  constructor(private readonly prisma: PrismaService) {}

  async listForUser(userId: string, role: string) {
    const globals = await this.prisma.appointmentKind.findMany({
      where: { doctorId: null },
      orderBy: { name: 'asc' },
    });

    if (role === 'DOCTOR' || role === 'HOSPITAL') {
      const personals = await this.prisma.appointmentKind.findMany({
        where: { doctorId: userId },
        orderBy: { name: 'asc' },
      });
      return [...globals, ...personals];
    }

    return globals;
  }

  async createForDoctor(userId: string, dto: { name: string; description?: string }) {
    return this.prisma.appointmentKind.create({
      data: {
        name: dto.name,
        description: dto.description,
        doctorId: userId,
      },
    });
  }
}