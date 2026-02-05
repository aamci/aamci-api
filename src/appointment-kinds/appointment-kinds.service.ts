import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class AppointmentKindsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Public: returns global kinds + doctor-specific kinds */
  async listPublicForDoctor(doctorId: string) {
    const globals = await this.prisma.appointmentKind.findMany({
      where: { doctorId: null },
      orderBy: { name: 'asc' },
    });

    const personals = await this.prisma.appointmentKind.findMany({
      where: { doctorId },
      orderBy: { name: 'asc' },
    });

    return [...globals, ...personals];
  }

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

  async createForDoctor(
    userId: string,
    dto: {
      name: string;
      description?: string;
      isTelemedicine?: boolean;
      durationMins?: number;
      color?: string;
    }
  ) {
    return this.prisma.appointmentKind.create({
      data: {
        name: dto.name,
        description: dto.description,
        doctorId: userId,
        isTelemedicine: dto.isTelemedicine ?? false,
        durationMins: dto.durationMins ?? 30,
        color: dto.color,
      },
    });
  }

  async updateForDoctor(
    userId: string,
    kindId: string,
    dto: {
      name?: string;
      description?: string;
      isTelemedicine?: boolean;
      durationMins?: number;
      color?: string;
    }
  ) {
    // Vérifier que le kind appartient au médecin
    const kind = await this.prisma.appointmentKind.findFirst({
      where: { id: kindId, doctorId: userId },
    });

    if (!kind) {
      throw new Error('Type de consultation non trouvé ou non autorisé');
    }

    return this.prisma.appointmentKind.update({
      where: { id: kindId },
      data: {
        name: dto.name,
        description: dto.description,
        isTelemedicine: dto.isTelemedicine,
        durationMins: dto.durationMins,
        color: dto.color,
      },
    });
  }

  async deleteForDoctor(userId: string, kindId: string) {
    // Vérifier que le kind appartient au médecin
    const kind = await this.prisma.appointmentKind.findFirst({
      where: { id: kindId, doctorId: userId },
    });

    if (!kind) {
      throw new Error('Type de consultation non trouvé ou non autorisé');
    }

    return this.prisma.appointmentKind.delete({
      where: { id: kindId },
    });
  }
}