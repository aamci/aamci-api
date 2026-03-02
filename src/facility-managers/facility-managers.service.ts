import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../common/prisma.service';
import { CreateFacilityManagerDto } from './dto/create-facility-manager.dto';
import { UpdateFacilityManagerDto } from './dto/update-facility-manager.dto';

@Injectable()
export class FacilityManagersService {
  constructor(private prisma: PrismaService) {}

  async create(dto: CreateFacilityManagerDto) {
    // Vérifier que l'utilisateur existe et a le bon rôle
    const user = await this.prisma.user.findUnique({
      where: { id: dto.userId },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (user.role !== 'FACILITY_MANAGER') {
      throw new BadRequestException('User must have FACILITY_MANAGER role');
    }

    // Vérifier que l'établissement existe
    const facility = await this.prisma.facility.findUnique({
      where: { id: dto.facilityId },
    });

    if (!facility) {
      throw new NotFoundException('Facility not found');
    }

    // Vérifier qu'il n'y a pas déjà un gestionnaire pour cet utilisateur
    const existing = await this.prisma.facilityManager.findUnique({
      where: { userId: dto.userId },
    });

    if (existing) {
      throw new BadRequestException('User is already a facility manager');
    }

    return this.prisma.facilityManager.create({
      data: {
        userId: dto.userId,
        facilityId: dto.facilityId,
        managedDoctorIds: dto.managedDoctorIds || [],
      },
      include: {
        user: true,
        facility: true,
      },
    });
  }

  async findOne(userId: string) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId },
      include: {
        user: true,
        facility: true,
      },
    });

    if (!manager) {
      throw new NotFoundException('Facility manager not found');
    }

    return manager;
  }

  async update(userId: string, dto: UpdateFacilityManagerDto) {
    const manager = await this.findOne(userId);

    return this.prisma.facilityManager.update({
      where: { id: manager.id },
      data: {
        facilityId: dto.facilityId,
        managedDoctorIds: dto.managedDoctorIds,
      },
      include: {
        user: true,
        facility: true,
      },
    });
  }

  async assignDoctor(managerId: string, doctorId: string) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId: managerId },
    });

    if (!manager) {
      throw new NotFoundException('Facility manager not found');
    }

    // Vérifier que le docteur existe et a le bon rôle
    const doctor = await this.prisma.user.findUnique({
      where: { id: doctorId },
    });

    if (!doctor || doctor.role !== 'DOCTOR') {
      throw new BadRequestException('Invalid doctor ID');
    }

    // Ajouter le docteur à la liste si pas déjà présent
    const managedDoctorIds = manager.managedDoctorIds || [];
    if (!managedDoctorIds.includes(doctorId)) {
      managedDoctorIds.push(doctorId);

      return this.prisma.facilityManager.update({
        where: { id: manager.id },
        data: { managedDoctorIds },
        include: {
          user: true,
          facility: true,
        },
      });
    }

    return manager;
  }

  async removeDoctor(managerId: string, doctorId: string) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId: managerId },
    });

    if (!manager) {
      throw new NotFoundException('Facility manager not found');
    }

    // Retirer le docteur de la liste
    const managedDoctorIds = (manager.managedDoctorIds || []).filter(
      (id) => id !== doctorId,
    );

    return this.prisma.facilityManager.update({
      where: { id: manager.id },
      data: { managedDoctorIds },
      include: {
        user: true,
        facility: true,
      },
    });
  }

  async getManagedDoctors(managerId: string) {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId: managerId },
      include: {
        facility: {
          include: {
            doctors: {
              include: {
                user: true,
              },
            },
          },
        },
      },
    });

    if (!manager) {
      throw new NotFoundException('Facility manager not found');
    }

    // Docteurs de la structure
    const facilityDoctorIds = manager.facility.doctors.map((d) => d.userId);

    // Docteurs override individuels
    const overrideDoctorIds = manager.managedDoctorIds || [];

    // Union des deux listes (sans doublons)
    const allDoctorIds = [...new Set([...facilityDoctorIds, ...overrideDoctorIds])];

    return this.prisma.user.findMany({
      where: {
        id: { in: allDoctorIds },
        role: 'DOCTOR',
      },
      select: {
        id: true,
        fullName: true,
        email: true,
        avatarUrl: true,
        phone: true,
        city: true,
        isActive: true,
        doctorProfile: true,
      },
    });
  }

  async canManageDoctor(managerId: string, doctorId: string): Promise<boolean> {
    const manager = await this.prisma.facilityManager.findUnique({
      where: { userId: managerId },
      include: {
        facility: {
          include: {
            doctors: true,
          },
        },
      },
    });

    if (!manager) {
      return false;
    }

    // Vérifier si le docteur est dans la structure
    const facilityDoctorIds = manager.facility.doctors.map((d) => d.userId);
    if (facilityDoctorIds.includes(doctorId)) {
      return true;
    }

    // Vérifier si le docteur est dans la liste override
    const overrideIds = manager.managedDoctorIds || [];
    return overrideIds.includes(doctorId);
  }
}
