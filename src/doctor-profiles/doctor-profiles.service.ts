import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DoctorProfilesService {
  constructor(private prisma: PrismaService) {}

  async getMine(userId: string) {
    const prof = await this.prisma.doctorProfile.findUnique({ where: { userId } });
    if (!prof) throw new NotFoundException('Doctor profile not found');
    return prof;
  }

  async createMine(userId: string) {
    // crée un profil vide si non existant
    return this.prisma.doctorProfile.upsert({
      where: { userId },
      create: { userId },
      update: {},
    });
  }

  async updateMine(userId: string, data: Partial<{
    specialty: string | null;
    hospitalType: string | null;
    address: string | null;
    city: string | null;
    presentation: string | null;
    formations: string | null;
    experiences: string | null;
    autoConfirmPatientBookings: boolean;
  }>) {
    await this.prisma.doctorProfile.upsert({
      where: { userId },
      create: { userId, ...data },
      update: { ...data },
    });
    // retourne la version à jour
    return this.prisma.doctorProfile.findUnique({ where: { userId } });
  }
}