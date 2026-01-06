// src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async doctors(q?: string, city?: string, specialty?: string, facilityId?: string) {
    const where: any = {
      role: 'DOCTOR',
    };

    if (q) {
      where.OR = [
        { fullName: { contains: q, mode: 'insensitive' } },
        { email: { contains: q, mode: 'insensitive' } },
        { doctorProfile: { presentation: { contains: q, mode: 'insensitive' } } },
      ];
    }

    if (city) {
      where.OR = [
        { city: { contains: city, mode: 'insensitive' } },
        { doctorProfile: { city: { contains: city, mode: 'insensitive' } } },
      ];
    }

    if (specialty || facilityId) {
      where.doctorProfile = {};

      if (specialty) {
        where.doctorProfile.specialty = { contains: specialty, mode: 'insensitive' };
      }

      if (facilityId) {
        where.doctorProfile.facilities = {
          some: {
            id: facilityId,
          },
        };
      }
    }

    return this.prisma.user.findMany({
      where,
      include: {
        doctorProfile: true,
      },
      take: 50,
    });
  }

  async hospitals(q?: string, city?: string) {
    return this.prisma.hospital.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      },
      take: 50,
    });
  }

  async pharmacies(q?: string, city?: string) {
    return this.prisma.pharmacy.findMany({
      where: {
        ...(q ? { name: { contains: q, mode: 'insensitive' } } : {}),
        ...(city ? { city: { contains: city, mode: 'insensitive' } } : {}),
      },
      take: 50,
    });
  }
}