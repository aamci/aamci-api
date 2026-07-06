import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class DoctorProfilesService {
  constructor(private prisma: PrismaService) {}

  async getMine(userId: string) {
    const prof = await this.prisma.doctorProfile.findUnique({
      where: { userId },
      include: { facilities: true },
    });
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
  async getFacilitiesById(doctorUserId: string) {
    const prof = await this.prisma.doctorProfile.findUnique({
      where: { userId: doctorUserId },
      include: { facilities: { select: { id: true, name: true, type: true, city: true, address: true, phone: true } } },
    });
    return prof?.facilities ?? [];
  }

  async getFacilities(userId: string) {
    const prof = await this.prisma.doctorProfile.findUnique({
      where: { userId },
      include: { facilities: { select: { id: true, name: true, type: true, city: true, address: true, phone: true } } },
    });
    return prof?.facilities ?? [];
  }

  async addFacility(userId: string, facilityId: string) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: { facilities: { connect: { id: facilityId } } },
      include: { facilities: { select: { id: true, name: true, type: true, city: true, address: true } } },
    });
  }

  async removeFacility(userId: string, facilityId: string) {
    return this.prisma.doctorProfile.update({
      where: { userId },
      data: { facilities: { disconnect: { id: facilityId } } },
      include: { facilities: { select: { id: true, name: true, type: true, city: true } } },
    });
  }

  async search(query: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        OR: [
          { fullName: { contains: query, mode: 'insensitive' } },
          { doctorProfile: { specialty: { contains: query, mode: 'insensitive' } } },
        ],
      },
      take: 20,
      select: {
        id: true,
        fullName: true,
        avatarUrl: true,
        doctorProfile: { select: { specialty: true, city: true } },
      },
    });
  }

}