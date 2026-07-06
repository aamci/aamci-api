// src/search/search.service.ts
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class SearchService {
  constructor(private readonly prisma: PrismaService) {}

  async doctors(
    q?: string,
    city?: string,
    specialty?: string,
    facilityId?: string,
    availableIn?: string,
    video?: string,
  ) {
    const where: any = { role: 'DOCTOR' };

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
        where.doctorProfile.facilities = { some: { id: facilityId } };
      }
    }

    // Collect doctor IDs to restrict based on availability / video filters
    let restrictedIds: string[] | null = null;

    if (availableIn) {
      const days = Math.min(parseInt(availableIn) || 7, 30);
      const today = new Date();
      const until = new Date();
      until.setDate(until.getDate() + days);

      // Build set of ISO day-of-week numbers for the next N days (1=Mon, 7=Sun)
      const dowSet = new Set<number>();
      for (let i = 0; i < days; i++) {
        const d = new Date(today);
        d.setDate(d.getDate() + i);
        dowSet.add(d.getDay() === 0 ? 7 : d.getDay());
      }
      const daysOfWeek = Array.from(dowSet);

      const rules = await this.prisma.availabilityRule.findMany({
        where: {
          ownerType: 'DOCTOR',
          startDate: { lte: until },
          endDate: { gte: today },
        },
        select: { ownerId: true, daysOfWeek: true },
      });

      restrictedIds = [
        ...new Set(
          rules
            .filter(r => r.daysOfWeek.some(d => daysOfWeek.includes(d)))
            .map(r => r.ownerId),
        ),
      ];
    }

    if (video === 'true') {
      const kinds = await this.prisma.appointmentKind.findMany({
        where: { isTelemedicine: true, doctorId: { not: null } },
        select: { doctorId: true },
      });
      const videoIds = [...new Set(kinds.map(k => k.doctorId).filter(Boolean) as string[])];

      restrictedIds =
        restrictedIds !== null
          ? restrictedIds.filter(id => videoIds.includes(id))
          : videoIds;
    }

    if (restrictedIds !== null) {
      where.id = { in: restrictedIds };
    }

    return this.prisma.user.findMany({
      where,
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        phone: true,
        sex: true,
        city: true,
        isActive: true,
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