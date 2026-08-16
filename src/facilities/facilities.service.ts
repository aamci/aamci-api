import { Injectable } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';

@Injectable()
export class FacilitiesService {
  constructor(private prisma: PrismaService) {}

  findAll(params: {
    q?: string;
    city?: string;
    type?: string;
    specialtyId?: string;
    page?: number;
    limit?: number;
  }) {
    const { q, city, type, specialtyId, page = 1, limit = 20 } = params;
    const where: any = {};

    if (q) {
      where.OR = [
        { name: { contains: q, mode: 'insensitive' } },
        { description: { contains: q, mode: 'insensitive' } },
        { city: { contains: q, mode: 'insensitive' } },
      ];
    }
    if (city) where.city = { equals: city, mode: 'insensitive' };
    if (type) where.type = type;
    // filter doctors by specialty: use relation filter
    if (specialtyId) {
      where.doctors = { some: { specialtyId } };
    }

    return this.prisma.facility.findMany({
      where,
      include: { _count: { select: { doctors: true } } },
      skip: (page - 1) * limit,
      take: limit,
      orderBy: { name: 'asc' },
    });
  }

  findOne(id: string) {
    return this.prisma.facility.findUnique({
      where: { id },
      include: {
        // hydrate doctors (paginate at controller if needed)
        doctors: {
          select: {
            id: true,
            specialty: true,
            user: {
              select: {
                id: true,
                fullName: true,
                avatarUrl: true,
              }
            },
          },
          take: 50,
        },
      },
    });
  }

  async getDoctorsByFacility(
    facilityId: string,
    specialtyId?: string,
    page: number = 1,
    limit: number = 20,
  ) {
    const where: any = {
      facilities: { some: { id: facilityId } },
      user: { isActive: true },
    };

    if (specialtyId) {
      where.specialty = {
        contains: specialtyId,
        mode: 'insensitive',
      };
    }

    const [doctors, total] = await Promise.all([
      this.prisma.doctorProfile.findMany({
        where,
        include: {
          user: {
            select: {
              id: true,
              fullName: true,
              email: true,
              avatarUrl: true,
            },
          },
        },
        skip: (page - 1) * limit,
        take: limit,
        orderBy: {
          user: {
            fullName: 'asc',
          },
        },
      }),
      this.prisma.doctorProfile.count({ where }),
    ]);

    return {
      data: doctors,
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async addDoctor(facilityId: string, doctorId: string) {
    // Many-to-many implicite: connecter le docteur à la facility
    return this.prisma.facility.update({
      where: { id: facilityId },
      data: {
        doctors: {
          connect: { id: doctorId },
        },
      },
      include: {
        doctors: {
          include: {
            user: {
              select: {
                id: true,
                fullName: true,
                email: true,
              },
            },
          },
        },
      },
    });
  }

  async removeDoctor(facilityId: string, doctorId: string) {
    // Déconnecter un docteur d'une facility
    return this.prisma.facility.update({
      where: { id: facilityId },
      data: {
        doctors: {
          disconnect: { id: doctorId },
        },
      },
    });
  }
}