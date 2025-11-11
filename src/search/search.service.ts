// src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async doctors(q?: string, city?: string, specialty?: string) {
    return this.prisma.user.findMany({
      where: {
        role: 'DOCTOR',
        ...(q
          ? {
              OR: [
                { fullName: { contains: q, mode: 'insensitive' } },
                { email: { contains: q, mode: 'insensitive' } },
                { doctorProfile: { presentation: { contains: q, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(city
          ? {
              OR: [
                { city: { contains: city, mode: 'insensitive' } },
                { doctorProfile: { city: { contains: city, mode: 'insensitive' } } },
              ],
            }
          : {}),
        ...(specialty
          ? {
              doctorProfile: {
                specialty: { contains: specialty, mode: 'insensitive' },
              },
            }
          : {}),
      },
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